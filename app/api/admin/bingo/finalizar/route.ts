import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { finalizarSalaBingo } from '@/lib/bingo-helpers'

/**
 * POST /api/admin/bingo/finalizar
 * Finaliza uma sala de bingo e processa ganhadores
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
  } catch (error) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { salaId } = body

    if (!salaId) {
      return NextResponse.json({ error: 'ID da sala é obrigatório' }, { status: 400 })
    }

    const sala = await prisma.salaBingo.findUnique({
      where: { id: Number(salaId) },
      include: { 
        cartelas: true,
      },
    })

    if (!sala) {
      return NextResponse.json({ error: 'Sala não encontrada' }, { status: 404 })
    }

    if (!sala.emAndamento) {
      return NextResponse.json({ error: 'Sala não está em andamento' }, { status: 400 })
    }

    // Usar função auxiliar para finalizar a sala
    const resultadoFinalizacao = await finalizarSalaBingo(sala.id)

    if (!resultadoFinalizacao.sucesso) {
      return NextResponse.json(
        { error: resultadoFinalizacao.erro || 'Erro ao finalizar sala' },
        { status: 500 }
      )
    }

    // Buscar sala finalizada para retornar
    const salaFinalizada = await prisma.salaBingo.findUnique({
      where: { id: sala.id },
    })

    return NextResponse.json({
      sala: salaFinalizada,
      resultados: resultadoFinalizacao.resultados,
      ganhadores: resultadoFinalizacao.ganhadores,
    })
  } catch (error) {
    console.error('Erro ao finalizar sala de bingo:', error)
    return NextResponse.json({ error: 'Erro ao finalizar sala' }, { status: 500 })
  }
}
