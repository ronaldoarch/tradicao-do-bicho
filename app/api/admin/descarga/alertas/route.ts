import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { parseSessionToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buscarAlertasDescarga, resolverAlertaDescarga } from '@/lib/descarga-helpers'

/**
 * GET /api/admin/descarga/alertas
 * Lista alertas de descarga
 */
export async function GET(request: NextRequest) {
  const session = cookies().get('lotbicho_session')?.value
  const user = parseSessionToken(session)

  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const resolvido = searchParams.get('resolvido') === 'true'

    const alertas = await buscarAlertasDescarga(resolvido)

    return NextResponse.json({ alertas })
  } catch (error) {
    console.error('Erro ao buscar alertas de descarga:', error)
    return NextResponse.json({ error: 'Erro ao carregar alertas' }, { status: 500 })
  }
}

/**
 * POST /api/admin/descarga/alertas/resolver
 * Resolve um alerta de descarga
 */
export async function POST(request: NextRequest) {
  const session = cookies().get('lotbicho_session')?.value
  const user = parseSessionToken(session)

  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { alertaId } = body

    if (!alertaId) {
      return NextResponse.json({ error: 'ID do alerta é obrigatório' }, { status: 400 })
    }

    await resolverAlertaDescarga(alertaId, user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao resolver alerta de descarga:', error)
    return NextResponse.json({ error: 'Erro ao resolver alerta' }, { status: 500 })
  }
}
