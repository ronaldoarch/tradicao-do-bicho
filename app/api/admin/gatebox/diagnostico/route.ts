import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/admin-auth'
import { getGateboxConfig, gateboxAuthenticate, gateboxClearTokenCache } from '@/lib/gatebox-client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/gatebox/diagnostico
 * Compara o IP do servidor (ipify) com o resultado de uma chamada à Gatebox.
 * Útil quando "IP não autorizado" aparece mesmo com o IP correto na whitelist.
 */
export async function GET(request: NextRequest) {
  const adminCheck = await requireAdminAPI(request)
  if (adminCheck instanceof NextResponse) {
    return adminCheck
  }

  const result: {
    ipServidor: string | null
    ipServidor2?: string
    ipsDiferentes?: boolean
    ipServidorErro?: string
    gateboxConfig: boolean
    authOk: boolean
    authErro?: string
    mensagem?: string
  } = {
    ipServidor: null,
    gateboxConfig: false,
    authOk: false,
  }

  // 1. Obter IP do servidor (ipify = mesmo que a página Admin)
  try {
    const ipRes = await fetch('https://api.ipify.org?format=json', {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    if (ipRes.ok) {
      const ipData = await ipRes.json()
      result.ipServidor = ipData.ip as string
    }
  } catch (e) {
    result.ipServidorErro = e instanceof Error ? e.message : String(e)
  }

  // 1b. Segundo serviço para verificar se o servidor tem múltiplos IPs de saída
  try {
    const ip2Res = await fetch('https://icanhazip.com', {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    if (ip2Res.ok) {
      const ip2 = (await ip2Res.text()).trim()
      result.ipServidor2 = ip2
      if (result.ipServidor && ip2 !== result.ipServidor) {
        result.ipsDiferentes = true
      }
    }
  } catch {
    // Ignorar falha do segundo serviço
  }

  // 2. Tentar autenticar na Gatebox (usa o mesmo IP que o saque)
  const config = await getGateboxConfig()
  result.gateboxConfig = !!config

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
