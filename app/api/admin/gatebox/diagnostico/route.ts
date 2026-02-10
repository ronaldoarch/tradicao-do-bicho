import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/admin-auth'
import {
  getGateboxConfig,
  gateboxAuthenticate,
  gateboxClearTokenCache,
  gateboxWithdraw,
} from '@/lib/gatebox-client'
import { normalizePixKey, sanitizeDocumentNumber } from '@/lib/pix-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/gatebox/diagnostico
 * Compara o IP do servidor (ipify) com o resultado de uma chamada à Gatebox.
 *
 * POST /api/admin/gatebox/diagnostico
 * Testa o endpoint de withdraw (saque) com R$ 1,00.
 * Body: { key: string, name?: string } - chave PIX de destino (sua própria para receber o valor de volta).
 */
export async function GET(request: NextRequest) {
  const adminCheck = await requireAdminAPI(request)
  if (adminCheck instanceof NextResponse) {
    return adminCheck
  }

  const result: {
    ipServidor: string | null
    ipsUnicos: string[]
    ipServidorErro?: string
    gateboxConfig: boolean
    baseUrl?: string
    authOk: boolean
    authErro?: string
    mensagem?: string
  } = {
    ipServidor: null,
    ipsUnicos: [],
    gateboxConfig: false,
    authOk: false,
  }

  // 1. Obter IP de múltiplos serviços (servidor pode ter IPs diferentes por destino/rota)
  const ipServices = [
    { url: 'https://api.ipify.org?format=json', parse: (r: Response) => r.json().then((d: { ip?: string }) => d.ip) },
    { url: 'https://icanhazip.com', parse: (r: Response) => r.text().then((t) => t.trim()) },
    { url: 'https://ifconfig.me/ip', parse: (r: Response) => r.text().then((t) => t.trim()) },
    { url: 'https://checkip.amazonaws.com', parse: (r: Response) => r.text().then((t) => t.trim()) },
    { url: 'https://api64.ipify.org', parse: (r: Response) => r.text().then((t) => t.trim()) },
  ]
  const ipsEncontrados: string[] = []
  for (const svc of ipServices) {
    try {
      const res = await fetch(svc.url, { cache: 'no-store', signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        const ip = (await svc.parse(res)) as string
        if (ip && /^[\d.:a-fA-F]+$/.test(ip)) ipsEncontrados.push(ip)
      }
    } catch {
      // ignorar
    }
  }
  result.ipServidor = ipsEncontrados[0] ?? null
  result.ipsUnicos = Array.from(new Set(ipsEncontrados))

  // 2. Tentar autenticar na Gatebox (usa o mesmo IP que o saque)
  const config = await getGateboxConfig()
  result.gateboxConfig = !!config
  if (config) {
    result.baseUrl = config.baseUrl || 'https://api.gatebox.com.br'
  }

  if (!config) {
    result.mensagem = 'Gatebox não configurado. Configure em Admin → Gateways.'
    return NextResponse.json(result)
  }

  gateboxClearTokenCache()

  try {
    await gateboxAuthenticate(config)
    result.authOk = true
    result.mensagem =
      'Autenticação OK. O IP do servidor coincide com o que a Gatebox espera. Se o saque falha, o erro pode ser em outro endpoint (withdraw).'
  } catch (authError: unknown) {
    const err = authError instanceof Error ? authError : new Error(String(authError))
    result.authErro = err.message
    result.mensagem =
      'Autenticação falhou. Verifique se o IP abaixo está na whitelist da Gatebox. Alguns provedores usam IPs diferentes para requisições distintas.'
  }

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdminAPI(request)
  if (adminCheck instanceof NextResponse) {
    return adminCheck
  }

  let body: { key?: string; name?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Body inválido. Envie { "key": "sua_chave_pix", "name": "Seu Nome" }' },
      { status: 400 }
    )
  }

  const key = typeof body.key === 'string' ? body.key.trim() : ''
  if (!key) {
    return NextResponse.json(
      { error: 'Informe a chave PIX (key) para receber o valor de teste. Será enviado R$ 1,00.' },
      { status: 400 }
    )
  }

  const config = await getGateboxConfig()
  if (!config) {
    return NextResponse.json({ error: 'Gatebox não configurado' }, { status: 503 })
  }

  const adminUser = await prisma.usuario.findFirst({
    where: { isAdmin: true },
    select: { nome: true, cpf: true },
  })

  const name = typeof body.name === 'string' ? body.name.trim() : adminUser?.nome ?? 'Teste Admin'
  const keyNormalizada = normalizePixKey(key)
  const documentNumber = sanitizeDocumentNumber(adminUser?.cpf)

  gateboxClearTokenCache()

  try {
    const result = await gateboxWithdraw(config, {
      externalId: `teste-ip-${Date.now()}`,
      key: keyNormalizada,
      name,
      amount: 1,
      description: 'Teste diagnóstico IP (Admin)',
      documentNumber,
    })
    return NextResponse.json({
      ok: true,
      mensagem: 'Withdraw (saque) OK! O IP está autorizado para o endpoint de saque. R$ 1,00 foi enviado para a chave informada.',
      result,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({
      ok: false,
      error: msg,
      mensagem:
        'Withdraw falhou. Se o erro for "IP não autorizado", a Gatebox valida o IP separadamente no endpoint de saque. Consulte os logs do servidor para ver a resposta completa da Gatebox.',
    })
  }
}
