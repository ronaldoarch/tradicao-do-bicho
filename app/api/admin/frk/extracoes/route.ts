import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/admin-auth'
import { getFrkConfigForClient } from '@/lib/frk-store'
import { FrkApiClient } from '@/lib/frk-api-client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/frk/extracoes?data=YYYY-MM-DD
 * Busca extrações disponíveis
 */
export async function GET(request: NextRequest) {
  const adminCheck = await requireAdminAPI(request)
  if (adminCheck instanceof NextResponse) {
    return adminCheck
  }

  try {
    const { searchParams } = new URL(request.url)
    const data = searchParams.get('data') || new Date().toISOString().split('T')[0]

    // Buscar configuração
    const configData = await getFrkConfigForClient()
    if (!configData) {
      return NextResponse.json(
        { error: 'Configuração FRK não encontrada' },
        { status: 400 }
      )
    }

    // Criar cliente
    const client = new FrkApiClient(configData)

    // Buscar extrações
    const extracoes = await client.buscarExtracoes(data)

    return NextResponse.json({
      success: true,
      data,
      extracoes,
    })
  } catch (error: any) {
    console.error('Erro ao buscar extrações FRK:', error)
    return NextResponse.json(
      { 
        error: 'Erro ao buscar extrações',
        message: error.message || 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}
