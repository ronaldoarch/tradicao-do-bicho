import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { getActiveGateway, getGatewayConfig } from '@/lib/gateways-store'
import { selectbankingCreateDeposit } from '@/lib/selectbanking-client'
import { sanitizeDocumentNumber } from '@/lib/pix-helpers'
import { appendWebhookSecret, getWebhookSecret } from '@/lib/webhook-security'

export const dynamic = 'force-dynamic'

const VALOR_TESTE_REAIS = 1

/**
 * POST /api/admin/selectbanking/test-deposit
 * Gera PIX de depósito de teste (R$ 1,00) via Cash API e cria transação pendente no primeiro admin.
 * Body opcional: { "valor": 1 } (mínimo 1 real se o provedor permitir).
 */
export async function POST(request: NextRequest) {
  const adminCheck = await requireAdminAPI(request)
  if (adminCheck instanceof NextResponse) {
    return adminCheck
  }

  let valorReais = VALOR_TESTE_REAIS
  try {
    const body = await request.json().catch(() => ({}))
    const v = body?.valor
    if (v != null && typeof v === 'number' && !Number.isNaN(v) && v >= 1) {
      valorReais = Math.min(100, Math.round(v * 100) / 100)
    }
  } catch {
    /* usa padrão */
  }

  const gateway = await getActiveGateway()
  if (!gateway || gateway.type !== 'selectbanking') {
    return NextResponse.json(
      {
        error:
          'Nenhum gateway SelectBanking ativo. Ative um gateway SelectBanking em Admin → Gateways e tente novamente.',
      },
      { status: 400 }
    )
  }

  const raw = await getGatewayConfig(gateway)
  if (!raw || raw.type !== 'selectbanking') {
    return NextResponse.json({ error: 'Configuração SelectBanking inválida (token/base URL).' }, { status: 503 })
  }

  const adminUser = await prisma.usuario.findFirst({
    where: { isAdmin: true },
    select: { id: true, nome: true, email: true, cpf: true },
  })

  if (!adminUser) {
    return NextResponse.json({ error: 'Nenhum usuário administrador encontrado no banco.' }, { status: 400 })
  }

  const cpfLimpo = sanitizeDocumentNumber(adminUser.cpf)
  if (!cpfLimpo || cpfLimpo.length !== 11) {
    return NextResponse.json(
      {
        error:
          'CPF do primeiro admin obrigatório para depósito PIX: atualize o campo CPF do usuário admin no banco ou no perfil.',
      },
      { status: 400 }
    )
  }

  const email = adminUser.email?.trim().toLowerCase()
  if (!email) {
    return NextResponse.json(
      { error: 'E-mail do usuário admin é obrigatório para gerar o depósito de teste.' },
      { status: 400 }
    )
  }

  const baseUrlPublic =
    process.env.NEXT_PUBLIC_APP_URL ||
    (request.headers.get('host') ? `https://${request.headers.get('host')}` : 'http://localhost:3001')

  const secret = getWebhookSecret('selectbanking')
  const postbackUrl = appendWebhookSecret(
    `${baseUrlPublic.replace(/\/$/, '')}/api/webhooks/selectbanking`,
    secret
  )

  const externalId = `deposito_${adminUser.id}_${Date.now()}`
  const amountCents = Math.round(valorReais * 100)

  try {
    const pixResponse = await selectbankingCreateDeposit(
      {
        baseUrl: raw.baseUrl,
        token: raw.token,
      },
      {
        amountCents,
        externalId,
        postbackUrl,
        payer: {
          name: adminUser.nome?.trim() || 'Teste Admin',
          email,
          document: cpfLimpo,
        },
      }
    )

    const providerId = pixResponse.id || ''

    const transacao = await prisma.transacao.create({
      data: {
        usuarioId: adminUser.id,
        tipo: 'deposito',
        status: 'pendente',
        valor: valorReais,
        gatewayId: gateway.id,
        referenciaExterna: externalId,
        descricao: `Teste depósito Admin — SelectBanking (${gateway.name}) id=${providerId || '—'}`,
      },
    })

    return NextResponse.json({
      ok: true,
      mensagem: `PIX de teste gerado (R$ ${valorReais.toFixed(2).replace('.', ',')}). Pague com o app do banco para validar postback e crédito na carteira do admin (usuário #${adminUser.id}).`,
      qrCodeText: pixResponse.qrCodeText,
      qrCodeImage: pixResponse.qrCodeImage || null,
      depositId: providerId,
      externalId,
      transacaoId: transacao.id,
      usuarioId: adminUser.id,
      valor: valorReais,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[SelectBanking test-deposit]', msg)
    return NextResponse.json({
      ok: false,
      error: msg,
      hint:
        'Confira baseUrl (ex.: https://api.selectbanking.com.br/api/public/cash), token na API Key, limites mínimos da Cash API e NEXT_PUBLIC_APP_URL para o postback.',
    })
  }
}
