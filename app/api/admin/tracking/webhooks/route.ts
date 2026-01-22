import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/tracking/webhooks
 * Lista eventos de webhooks com filtros
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
  } catch (error) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const source = searchParams.get('source')
    const eventType = searchParams.get('eventType')
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const where: any = {}

    if (source) {
      where.source = source
    }

    if (eventType) {
      where.eventType = { contains: eventType, mode: 'insensitive' }
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

    const events = await prisma.webhookEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 1000, // Limitar a 1000 eventos mais recentes
    })

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Erro ao buscar eventos de webhook:', error)
    return NextResponse.json({ error: 'Erro ao carregar eventos' }, { status: 500 })
  }
}
