import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/gatebox/ip
 * Retorna o IP público de saída do servidor (para adicionar na whitelist da Gatebox)
 *
 * A Gatebox valida o IP do servidor que faz as requisições (saques, depósitos),
 * NÃO o IP do navegador do usuário. Adicione este IP na whitelist do painel Gatebox.
 */
export async function GET(request: NextRequest) {
  const adminCheck = await requireAdminAPI(request)
  if (adminCheck instanceof NextResponse) {
    return adminCheck
  }

  try {
    const res = await fetch('https://api.ipify.org?format=json', {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      throw new Error(`Falha ao obter IP: ${res.status}`)
    }

    const data = await res.json()
    const ip = data.ip as string

    return NextResponse.json({
      ip,
      mensagem:
        'Adicione este IP na whitelist do painel Gatebox. A Gatebox valida o IP do servidor que faz as requisições (saques, depósitos), não o IP do seu navegador.',
    })
  } catch (error) {
    console.error('Erro ao obter IP do servidor:', error)
    return NextResponse.json(
      {
        error: 'Não foi possível obter o IP do servidor',
        dica: 'Verifique o IP de saída do seu servidor (Coolify/VPS) no painel do provedor ou usando: curl https://api.ipify.org',
      },
      { status: 500 }
    )
  }
}
