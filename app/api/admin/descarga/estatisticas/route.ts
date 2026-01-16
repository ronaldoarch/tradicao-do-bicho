import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { parseSessionToken } from '@/lib/auth'
import { buscarEstatisticasDescarga } from '@/lib/descarga-helpers'

/**
 * GET /api/admin/descarga/estatisticas
 * Busca estatísticas de descarga
 */
export async function GET(request: NextRequest) {
  const session = cookies().get('lotbicho_session')?.value
  const user = parseSessionToken(session)

  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const modalidade = searchParams.get('modalidade') || undefined
    const premio = searchParams.get('premio') ? parseInt(searchParams.get('premio')!, 10) : undefined
    const dataConcurso = searchParams.get('dataConcurso') ? new Date(searchParams.get('dataConcurso')!) : undefined

    const estatisticas = await buscarEstatisticasDescarga(modalidade, premio, dataConcurso)

    return NextResponse.json({ estatisticas })
  } catch (error) {
    console.error('Erro ao buscar estatísticas de descarga:', error)
    return NextResponse.json({ error: 'Erro ao carregar estatísticas' }, { status: 500 })
  }
}
