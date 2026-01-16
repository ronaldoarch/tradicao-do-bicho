import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { sortearNumero, verificarCartelasSala } from '@/lib/bingo-helpers'

/**
 * POST /api/admin/bingo/sortear
 * Sorteia um número para uma sala de bingo
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
    })

    if (!sala) {
      return NextResponse.json({ error: 'Sala não encontrada' }, { status: 404 })
    }

    if (!sala.emAndamento) {
      return NextResponse.json({ error: 'Sala não está em andamento' }, { status: 400 })
    }

    const numerosSorteados = (sala.numerosSorteados as number[]) || []
    const novoNumero = sortearNumero(numerosSorteados)
    const todosNumeros = [...numerosSorteados, novoNumero]

    // Atualizar sala com novo número
    const salaAtualizada = await prisma.salaBingo.update({
      where: { id: sala.id },
      data: {
        numerosSorteados: todosNumeros,
      },
    })

    // Verificar ganhadores
    const ganhadores = await verificarCartelasSala(sala.id)

    return NextResponse.json({
      numero: novoNumero,
      numerosSorteados: todosNumeros,
      ganhadores,
      totalSorteados: todosNumeros.length,
    })
  } catch (error) {
    console.error('Erro ao sortear número:', error)
    return NextResponse.json({ error: 'Erro ao sortear número' }, { status: 500 })
  }
}

/**
 * PUT /api/admin/bingo/sortear
 * Inicia ou reinicia uma sala de bingo
 */
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin()
  } catch (error) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { salaId, iniciar } = body

    if (!salaId) {
      return NextResponse.json({ error: 'ID da sala é obrigatório' }, { status: 400 })
    }

    const agora = new Date()
    const updateData: any = {
      emAndamento: Boolean(iniciar),
      dataInicio: iniciar ? agora : null,
      numerosSorteados: iniciar ? ([] as Prisma.InputJsonValue) : Prisma.JsonNull,
    }

    // Se está iniciando e tem sorteio automático, calcular próximo sorteio
    if (iniciar) {
      const salaAtual = await prisma.salaBingo.findUnique({
        where: { id: Number(salaId) },
        select: { sorteioAutomatico: true, intervaloSorteio: true },
      })

      if (salaAtual?.sorteioAutomatico && salaAtual.intervaloSorteio) {
        updateData.proximoSorteio = new Date(agora.getTime() + salaAtual.intervaloSorteio * 1000)
      }
    } else {
      // Se está parando, limpar próximo sorteio
      updateData.proximoSorteio = null
    }

    const sala = await prisma.salaBingo.update({
      where: { id: Number(salaId) },
      data: updateData,
    })

    return NextResponse.json({ sala })
  } catch (error) {
    console.error('Erro ao iniciar/finalizar sala:', error)
    return NextResponse.json({ error: 'Erro ao atualizar sala' }, { status: 500 })
  }
}
