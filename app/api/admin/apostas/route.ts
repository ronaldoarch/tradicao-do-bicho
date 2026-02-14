import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/apostas
 * Lista todas as apostas dos usuários com filtros
 */
export async function GET(request: NextRequest) {
  const adminCheck = await requireAdminAPI(request)
  if (adminCheck instanceof NextResponse) {
    return adminCheck
  }

  try {
    const { searchParams } = new URL(request.url)
    const usuarioId = searchParams.get('usuarioId')
    const status = searchParams.get('status')
    const modalidade = searchParams.get('modalidade')
    const dataInicio = searchParams.get('dataInicio')
    const dataFim = searchParams.get('dataFim')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const skip = (page - 1) * limit

    const where: any = {}

    if (usuarioId) {
      where.usuarioId = parseInt(usuarioId, 10)
    }

    if (status) {
      where.status = status
    }

    if (modalidade) {
      where.modalidade = modalidade
    }

    if (dataInicio || dataFim) {
      where.createdAt = {}
      if (dataInicio) {
        where.createdAt.gte = new Date(dataInicio)
      }
      if (dataFim) {
        const dataFimDate = new Date(dataFim)
        dataFimDate.setHours(23, 59, 59, 999)
        where.createdAt.lte = dataFimDate
      }
    }

    const [apostas, total] = await Promise.all([
      prisma.aposta.findMany({
        where,
        include: {
          usuario: {
            select: {
              id: true,
              nome: true,
              email: true,
              telefone: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip,
      }),
      prisma.aposta.count({ where }),
    ])

    return NextResponse.json({
      apostas,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erro ao buscar apostas:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar apostas' },
      { status: 500 }
    )
  }
}
