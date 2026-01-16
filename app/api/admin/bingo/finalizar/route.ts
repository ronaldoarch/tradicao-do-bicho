import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { parseSessionToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { verificarCartelasSala } from '@/lib/bingo-helpers'

/**
 * POST /api/admin/bingo/finalizar
 * Finaliza uma sala de bingo e processa ganhadores
 */
export async function POST(request: NextRequest) {
  const session = cookies().get('lotbicho_session')?.value
  const user = parseSessionToken(session)

  if (!user || !user.isAdmin) {
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
      include: { cartelas: true },
    })

    if (!sala) {
      return NextResponse.json({ error: 'Sala não encontrada' }, { status: 404 })
    }

    if (!sala.emAndamento) {
      return NextResponse.json({ error: 'Sala não está em andamento' }, { status: 400 })
    }

    // Verificar ganhadores
    const ganhadores = await verificarCartelasSala(sala.id)

    // Processar resultados e prêmios
    const resultados: Array<{
      tipo: string
      cartelasGanhadoras: number[]
      premioTotal: number
    }> = []

    // Bingo completo
    if (ganhadores.bingo.length > 0) {
      const premioPorCartela = sala.premioBingo / ganhadores.bingo.length
      for (const cartelaId of ganhadores.bingo) {
        await prisma.cartelaBingo.update({
          where: { id: cartelaId },
          data: {
            status: 'ganhou',
            premioRecebido: premioPorCartela,
          },
        })

        const cartela = sala.cartelas.find((c) => c.id === cartelaId)
        if (cartela) {
          await prisma.usuario.update({
            where: { id: cartela.usuarioId },
            data: {
              saldo: { increment: premioPorCartela },
            },
          })
        }
      }

      resultados.push({
        tipo: 'bingo',
        cartelasGanhadoras: ganhadores.bingo,
        premioTotal: sala.premioBingo,
      })
    }

    // Diagonal
    if (ganhadores.diagonal.length > 0 && ganhadores.bingo.length === 0) {
      const premioPorCartela = sala.premioDiagonal / ganhadores.diagonal.length
      for (const cartelaId of ganhadores.diagonal) {
        await prisma.cartelaBingo.update({
          where: { id: cartelaId },
          data: {
            status: 'ganhou',
            premioRecebido: premioPorCartela,
          },
        })

        const cartela = sala.cartelas.find((c) => c.id === cartelaId)
        if (cartela) {
          await prisma.usuario.update({
            where: { id: cartela.usuarioId },
            data: {
              saldo: { increment: premioPorCartela },
            },
          })
        }
      }

      resultados.push({
        tipo: 'diagonal',
        cartelasGanhadoras: ganhadores.diagonal,
        premioTotal: sala.premioDiagonal,
      })
    }

    // Coluna
    if (ganhadores.coluna.length > 0 && ganhadores.bingo.length === 0 && ganhadores.diagonal.length === 0) {
      const premioPorCartela = sala.premioColuna / ganhadores.coluna.length
      for (const cartelaId of ganhadores.coluna) {
        await prisma.cartelaBingo.update({
          where: { id: cartelaId },
          data: {
            status: 'ganhou',
            premioRecebido: premioPorCartela,
          },
        })

        const cartela = sala.cartelas.find((c) => c.id === cartelaId)
        if (cartela) {
          await prisma.usuario.update({
            where: { id: cartela.usuarioId },
            data: {
              saldo: { increment: premioPorCartela },
            },
          })
        }
      }

      resultados.push({
        tipo: 'coluna',
        cartelasGanhadoras: ganhadores.coluna,
        premioTotal: sala.premioColuna,
      })
    }

    // Linha
    if (ganhadores.linha.length > 0 && ganhadores.bingo.length === 0 && ganhadores.diagonal.length === 0 && ganhadores.coluna.length === 0) {
      const premioPorCartela = sala.premioLinha / ganhadores.linha.length
      for (const cartelaId of ganhadores.linha) {
        await prisma.cartelaBingo.update({
          where: { id: cartelaId },
          data: {
            status: 'ganhou',
            premioRecebido: premioPorCartela,
          },
        })

        const cartela = sala.cartelas.find((c) => c.id === cartelaId)
        if (cartela) {
          await prisma.usuario.update({
            where: { id: cartela.usuarioId },
            data: {
              saldo: { increment: premioPorCartela },
            },
          })
        }
      }

      resultados.push({
        tipo: 'linha',
        cartelasGanhadoras: ganhadores.linha,
        premioTotal: sala.premioLinha,
      })
    }

    // Criar registros de resultados
    const numerosSorteados = (sala.numerosSorteados as number[] | null) ?? []
    for (const resultado of resultados) {
      await prisma.resultadoBingo.create({
        data: {
          salaId: sala.id,
          tipo: resultado.tipo,
          numerosGanhadores: numerosSorteados as Prisma.InputJsonValue,
          cartelasGanhadoras: resultado.cartelasGanhadoras as Prisma.InputJsonValue,
          premioTotal: resultado.premioTotal,
        },
      })
    }

    // Finalizar sala
    const salaFinalizada = await prisma.salaBingo.update({
      where: { id: sala.id },
      data: {
        emAndamento: false,
        dataFim: new Date(),
        resultadoFinal: resultados,
      },
    })

    return NextResponse.json({
      sala: salaFinalizada,
      resultados,
      ganhadores,
    })
  } catch (error) {
    console.error('Erro ao finalizar sala de bingo:', error)
    return NextResponse.json({ error: 'Erro ao finalizar sala' }, { status: 500 })
  }
}
