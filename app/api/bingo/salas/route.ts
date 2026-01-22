import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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
      select: {
        id: true,
        nome: true,
        descricao: true,
        valorCartela: true,
        premioTotal: true,
        premioLinha: true,
        premioColuna: true,
        premioDiagonal: true,
        premioBingo: true,
        ativa: true,
        emAndamento: true,
        dataInicio: true,
        dataFim: true,
        numerosSorteados: true,
        resultadoFinal: true,
        _count: {
          select: {
            cartelas: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    console.log(`[BINGO] Salas encontradas: ${salas.length}`)
    salas.forEach((sala) => {
      console.log(`[BINGO] Sala: ${sala.nome} - Ativa: ${sala.ativa} - Em Andamento: ${sala.emAndamento}`)
    })

    return NextResponse.json(
      { salas },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  } catch (error) {
    console.error('Erro ao buscar salas de bingo:', error)
    return NextResponse.json({ error: 'Erro ao carregar salas' }, { status: 500 })
  }
}
