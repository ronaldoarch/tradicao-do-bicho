import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/tracking/facebook
 * Lista eventos do Facebook com filtros
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
  } catch (error) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const eventName = searchParams.get('eventName')
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const where: any = {}

    if (eventName) {
      where.eventName = { contains: eventName, mode: 'insensitive' }
    }

    if (status) {
      where.status = status
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        const dateToEnd = new Date(dateTo)
        dateToEnd.setHours(23, 59, 59, 999)
        where.createdAt.lte = dateToEnd
      }
    }

    const events = await prisma.facebookEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 1000, // Limitar a 1000 eventos mais recentes
    })

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Erro ao buscar eventos do Facebook:', error)
    return NextResponse.json({ error: 'Erro ao carregar eventos' }, { status: 500 })
  }
}
