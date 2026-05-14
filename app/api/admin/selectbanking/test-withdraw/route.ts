import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { getActiveGateway, getGatewayConfig } from '@/lib/gateways-store'
import { selectbankingCreateWithdrawal } from '@/lib/selectbanking-client'
import { normalizePixKey, sanitizeDocumentNumber, inferSelectBankingPixKeyType } from '@/lib/pix-helpers'
import { appendWebhookSecret, getWebhookSecret } from '@/lib/webhook-security'

export const dynamic = 'force-dynamic'

/** Piso da Cash API para cash-out PIX (erro 422 se menor). */
const CASH_API_SAQUE_MIN_REAIS = 10
const VALOR_TESTE_REAIS = CASH_API_SAQUE_MIN_REAIS
const VALOR_TESTE_CENTAVOS = Math.round(VALOR_TESTE_REAIS * 100)

/**
 * POST /api/admin/selectbanking/test-withdraw
 * Envia PIX de teste via Cash API (gateway ativo SelectBanking). Valor fixo R$ 10,00 (mínimo de saque da API).
 * Body: { key: string }
 */
export async function POST(request: NextRequest) {
  const adminCheck = await requireAdminAPI(request)
  if (adminCheck instanceof NextResponse) {
    return adminCheck
  }

  let body: { key?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido. Envie { "key": "sua_chave_pix" }' }, { status: 400 })
  }

  const key = typeof body.key === 'string' ? body.key.trim() : ''
  if (!key) {
    return NextResponse.json(
      { error: 'Informe a chave PIX. Será enviado o valor mínimo de teste (R$ 10,00) a partir da conta Cash API configurada.' },
      { status: 400 }
    )
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
    select: { nome: true, cpf: true },
  })

  const nome = adminUser?.nome?.trim() || 'Teste Admin'

  const chavePixNormalizada = normalizePixKey(key)
  const pixKeyType = inferSelectBankingPixKeyType(chavePixNormalizada)
  const pixKeyOut =
    pixKeyType === 'phone_number' ? normalizePixKey(chavePixNormalizada) : chavePixNormalizada

  const docRecebedor =
    sanitizeDocumentNumber(adminUser?.cpf) ||
    (() => {
      const d = pixKeyOut.replace(/\D/g, '')
      if (d.length === 11 || d.length === 14) return d
      return undefined
    })()

  if (!docRecebedor) {
    return NextResponse.json(
      {
        error:
          'CPF do usuário admin ou chave PIX do tipo documento (CPF/CNPJ) é obrigatório para o teste. Atualize o CPF de um admin no banco ou informe chave CPF/CNPJ.',
      },
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

  const externalId = `teste-admin-sb-${Date.now()}`

  try {
    const result = await selectbankingCreateWithdrawal(
      {
        baseUrl: raw.baseUrl,
        token: raw.token,
      },
      {
        amountCents: VALOR_TESTE_CENTAVOS,
        externalId,
        postbackUrl,
        description: 'Teste saque Admin (R$ 10,00)',
        recipient: {
          name: nome,
          document: docRecebedor,
          pixKeyType,
          pixKey: pixKeyOut,
        },
      }
    )

    return NextResponse.json({
      ok: true,
      mensagem: `Saque de teste enviado (R$ ${VALOR_TESTE_REAIS.toFixed(2).replace('.', ',')}). ID no provedor: ${result.id}. Acompanhe o webhook ou o painel SelectBanking.`,
      withdrawalId: result.id,
      externalId,
      testeRealPix: {
        titulo: 'Teste bem-sucedido!',
        subtitulo: 'Teste real: saque PIX enviado pela Cash API.',
        credenciaisConfiguradas: Boolean(raw.baseUrl && raw.token?.length),
        webhookUrl: postbackUrl,
        apiUrl: raw.baseUrl,
        webhookSecretConfigurado: Boolean(secret),
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[SelectBanking test-withdraw]', msg)
    return NextResponse.json({
      ok: false,
      error: msg,
      hint:
        'Confira baseUrl do gateway (ex.: https://api.selectbanking.com.br/api/public/cash), token Bearer na API Key, saldo na conta Cash API e se o PIX da chave está correto.',
    })
  }
}
