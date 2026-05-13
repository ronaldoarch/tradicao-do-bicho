import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyWebhookRequest } from '@/lib/webhook-security'
import { processarDepositoPago } from '@/lib/deposito-processor'

export const dynamic = 'force-dynamic'

const PAID_DEPOSIT = new Set([
  'paid',
  'completed',
  'complete',
  'approved',
  'success',
  'succeeded',
  'settled',
  'confirmed',
  'transferred',
])

const FAILED_DEPOSIT = new Set([
  'expired',
  'cancelled',
  'canceled',
  'failed',
  'refused',
  'rejected',
  'error',
])

const BLOCKED_DEPOSIT = new Set(['blocked', 'on_hold', 'hold', 'antifraud', 'in_review'])

const PAID_WITHDRAW = new Set([
  'transferred',
  'completed',
  'paid',
  'success',
  'approved',
  'confirmed',
])

const FAILED_WITHDRAW = new Set(['failed', 'returned', 'cancelled', 'canceled', 'refused', 'error'])

function extractPayload(body: Record<string, unknown>): Record<string, unknown> {
  const data = body.data
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>
  }
  return body
}

async function finalizeWebhookEvent(
  webhookEventId: number | null,
  ok: boolean,
  code: number,
  response: object
) {
  if (!webhookEventId) return
  try {
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        status: ok ? 'processed' : 'failed',
        statusCode: code,
        response,
        processedAt: new Date(),
      },
    })
  } catch {
    /* ignore */
  }
}

export async function POST(req: NextRequest) {
  let webhookEventId: number | null = null

  const rawBody = await req.text()
  const verified = verifyWebhookRequest(req, rawBody, 'selectbanking')
  if (!verified.ok) {
    return NextResponse.json({ error: verified.message }, { status: verified.status })
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(rawBody || '{}') as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const root = extractPayload(body)
  const externalId =
    (typeof root.externalId === 'string' && root.externalId) ||
    (typeof body.externalId === 'string' && body.externalId) ||
    undefined
  const idRaw = root.id ?? body.id
  const id = idRaw != null ? String(idRaw) : ''
  const statusRaw = root.status ?? body.status ?? ''
  const status = String(statusRaw).toLowerCase()
  const typeRaw = String(root.type ?? body.type ?? '').toLowerCase()

  try {
    const relevantHeaders: Record<string, string> = {}
    req.headers.forEach((value, key) => {
      if (
        key.toLowerCase().startsWith('x-') ||
        key.toLowerCase() === 'authorization' ||
        key.toLowerCase() === 'content-type'
      ) {
        relevantHeaders[key] = value
      }
    })

    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        source: 'selectbanking',
        eventType: typeRaw || status || 'unknown',
        payload: body as object,
        headers: relevantHeaders,
        status: 'received',
      },
    })
    webhookEventId = webhookEvent.id
  } catch (e) {
    console.error('WebhookEvent selectbanking:', e)
  }

  const refs = [externalId, id].filter(Boolean) as string[]

  if (refs.length === 0) {
    await finalizeWebhookEvent(webhookEventId, true, 200, { message: 'Sem referência' })
    return NextResponse.json({ message: 'Payload sem identificador' }, { status: 200 })
  }

  // --- Saque: referência = id retornado pela API ou externalId saque-N ---
  let saque =
    (await prisma.saque.findFirst({
      where: { referenciaExterna: { in: refs }, status: 'processando' },
    })) ?? null

  if (!saque && externalId?.startsWith('saque-')) {
    const m = externalId.match(/^saque-(\d+)$/)
    if (m) {
      const sid = parseInt(m[1], 10)
      saque = await prisma.saque.findFirst({ where: { id: sid, status: 'processando' } })
    }
  }

  if (saque) {
    if (PAID_WITHDRAW.has(status)) {
      await prisma.saque.update({ where: { id: saque.id }, data: { status: 'aprovado' } })
      await finalizeWebhookEvent(webhookEventId, true, 200, { message: 'Saque aprovado' })
      return NextResponse.json({ message: 'Saque aprovado' })
    }
    if (FAILED_WITHDRAW.has(status)) {
      await prisma.$transaction([
        prisma.saque.update({
          where: { id: saque.id },
          data: { status: 'rejeitado', motivo: `SelectBanking: ${status}` },
        }),
        prisma.usuario.update({
          where: { id: saque.usuarioId },
          data: {
            saldo: { increment: saque.valor },
            saldoSacavel: { increment: saque.valor },
          },
        }),
      ])
      await finalizeWebhookEvent(webhookEventId, true, 200, { message: 'Saque estornado' })
      return NextResponse.json({ message: 'Saque estornado' })
    }
    await finalizeWebhookEvent(webhookEventId, true, 200, { message: 'Saque: status pendente' })
    return NextResponse.json({ message: 'Aguardando status final' }, { status: 200 })
  }

  // --- Depósito (prefixo deposito_ ou transação pendente com referência) ---
  const transacao = await prisma.transacao.findFirst({
    where: {
      OR: refs.map((r) => ({ referenciaExterna: r })),
      tipo: 'deposito',
    },
  })

  if (!transacao && !externalId?.startsWith('deposito_')) {
    console.log('SelectBanking webhook: sem transação/saque', { status, typeRaw, refs })
    await finalizeWebhookEvent(webhookEventId, true, 200, { message: 'Sem alvo local' })
    return NextResponse.json({ message: 'Sem alvo local' }, { status: 200 })
  }

  if (!transacao) {
    await finalizeWebhookEvent(webhookEventId, true, 200, { message: 'Transação não encontrada' })
    return NextResponse.json({ message: 'Transação não encontrada' }, { status: 200 })
  }

  if (BLOCKED_DEPOSIT.has(status)) {
    if (transacao.status === 'pendente') {
      await prisma.transacao.update({
        where: { id: transacao.id },
        data: { status: 'falhou', descricao: `${transacao.descricao ?? ''} [Bloqueado: ${status}]`.trim() },
      })
    }
    await finalizeWebhookEvent(webhookEventId, true, 200, { message: 'Depósito bloqueado' })
    return NextResponse.json({ message: 'Depósito bloqueado' })
  }

  if (FAILED_DEPOSIT.has(status) || status === 'refunded' || status === 'returned') {
    if (transacao.status === 'pendente') {
      await prisma.transacao.update({ where: { id: transacao.id }, data: { status: 'falhou' } })
    }
    await finalizeWebhookEvent(webhookEventId, true, 200, { message: 'Depósito falhou/expirou' })
    return NextResponse.json({ message: 'Depósito atualizado' })
  }

  if (PAID_DEPOSIT.has(status)) {
    if (transacao.status === 'pago') {
      await finalizeWebhookEvent(webhookEventId, true, 200, { message: 'Já processada' })
      return NextResponse.json({ message: 'Já processada' }, { status: 200 })
    }
    const result = await processarDepositoPago(transacao.id)
    await finalizeWebhookEvent(
      webhookEventId,
      result.ok,
      result.ok ? 200 : 500,
      result.ok ? { message: 'Depósito creditado' } : { error: result.error }
    )
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    return NextResponse.json({ message: 'Depósito creditado' })
  }

  console.log('SelectBanking webhook: status não tratado', { status, typeRaw, refs })
  await finalizeWebhookEvent(webhookEventId, true, 200, { message: 'Status ignorado' })
  return NextResponse.json({ message: 'Nenhuma ação' }, { status: 200 })
}
