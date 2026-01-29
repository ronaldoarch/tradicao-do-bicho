import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/admin-auth'
import { getFrkConfigForClient } from '@/lib/frk-store'
import { FrkApiClient } from '@/lib/frk-api-client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/frk/resultados?data=YYYY-MM-DD&extracao=0
 * Busca resultados
 */
export async function GET(request: NextRequest) {
  const adminCheck = await requireAdminAPI(request)
  if (adminCheck instanceof NextResponse) {
    return adminCheck
  }

  try {
    const { searchParams } = new URL(request.url)
    const data = searchParams.get('data') || new Date().toISOString().split('T')[0]
    const extracao = searchParams.get('extracao') ? parseInt(searchParams.get('extracao')!, 10) : 0

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

    // Buscar resultados
    const resultados = await client.buscarResultados(data, extracao)

    return NextResponse.json({
      success: true,
      data,
      extracao: extracao || 'todas',
      resultados,
    })
  } catch (error: any) {
    console.error('Erro ao buscar resultados FRK:', error)
    return NextResponse.json(
      { 
        error: 'Erro ao buscar resultados',
        message: error.message || 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}
