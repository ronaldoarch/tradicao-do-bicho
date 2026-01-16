import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/bingo/salas
 * Lista salas de bingo ativas para usuários
 */
export async function GET(request: NextRequest) {
  try {
    const salas = await prisma.salaBingo.findMany({
      where: {
        ativa: true,
      },
      include: {
        _count: {
          select: {
            cartelas: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ salas })
  } catch (error) {
    console.error('Erro ao buscar salas de bingo:', error)
    return NextResponse.json({ error: 'Erro ao carregar salas' }, { status: 500 })
  }
}
