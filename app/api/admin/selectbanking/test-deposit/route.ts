import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { getActiveGateway, getGatewayConfig } from '@/lib/gateways-store'
import { selectbankingCreateDeposit } from '@/lib/selectbanking-client'
import { sanitizeDocumentNumber } from '@/lib/pix-helpers'
import { appendWebhookSecret, getWebhookSecret } from '@/lib/webhook-security'

export const dynamic = 'force-dynamic'

/** Piso da Cash API para cash-in PIX (erro 422 se menor). */
const CASH_API_DEPOSITO_MIN_REAIS = 5
const VALOR_TESTE_PADRAO_REAIS = CASH_API_DEPOSITO_MIN_REAIS

/**
 * POST /api/admin/selectbanking/test-deposit
 * Somente diagnóstico: chama a Cash API e obtém dados de PIX (mínimo R$ 5,00).
 * Não registra Transacao nem altera saldo na plataforma — crédito real é só pelo fluxo /carteira.
 * Body opcional: { "valor": 5 }, { "cpf" | "document": "..." }.
 */
export async function POST(request: NextRequest) {
  const adminCheck = await requireAdminAPI(request)
  if (adminCheck instanceof NextResponse) {
    return adminCheck
  }

  let body: Record<string, unknown> = {}
  try {
    body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  } catch {
    body = {}
  }

  let valorReais = VALOR_TESTE_PADRAO_REAIS
  const v = body.valor
  if (v != null && typeof v === 'number' && !Number.isNaN(v) && v >= CASH_API_DEPOSITO_MIN_REAIS) {
    valorReais = Math.min(100, Math.round(v * 100) / 100)
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

  const cpfDoBody =
    typeof body.cpf === 'string' ? body.cpf : typeof body.document === 'string' ? body.document : undefined
  const cpfLimpo =
    sanitizeDocumentNumber(cpfDoBody) || sanitizeDocumentNumber(adminUser.cpf)
  if (!cpfLimpo || cpfLimpo.length !== 11) {
    return NextResponse.json(
      {
        error:
          'CPF do pagador (11 dígitos) obrigatório: informe no campo "CPF do pagador (teste)" no Admin → Gateways ou cadastre o CPF do primeiro admin no perfil/banco.',
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

  /** externalId só no provedor; não usa prefixo deposito_ para não sugerir conciliação com carteira local. */
  const externalId = `teste-cashapi-diagnostico-${Date.now()}`
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

    const credenciaisConfiguradas = Boolean(raw.baseUrl && raw.token?.length)
    const webhookSecretConfigurado = Boolean(secret)

    return NextResponse.json({
      ok: true,
      mensagem: `Cash API aceitou a requisição: PIX de R$ ${valorReais.toFixed(2).replace('.', ',')} disponível só para conferência. Este teste não cria lançamento na carteira da plataforma; depósitos reais ficam em /carteira.`,
      qrCodeText: pixResponse.qrCodeText,
      qrCodeImage: pixResponse.qrCodeImage || null,
      depositId: providerId,
      externalId,
      apenasDiagnostico: true,
      valor: valorReais,
      testeRealPix: {
        titulo: 'Teste bem-sucedido!',
        subtitulo:
          'Conexão com a Cash API OK (PIX gerado). Nenhum valor é registrado na carteira pelo painel Admin neste modo.',
        credenciaisConfiguradas,
        webhookUrl: postbackUrl,
        apiUrl: raw.baseUrl,
        webhookSecretConfigurado,
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[SelectBanking test-deposit]', msg)
    return NextResponse.json({
      ok: false,
      error: msg,
      hint:
        `Valor de teste deve ser ≥ R$ ${CASH_API_DEPOSITO_MIN_REAIS.toFixed(2).replace('.', ',')} (mínimo Cash API). Confira baseUrl, token, NEXT_PUBLIC_APP_URL no postback.`,
    })
  }
}
