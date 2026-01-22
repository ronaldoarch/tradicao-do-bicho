import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { verificarCartelasSala } from '@/lib/bingo-helpers'

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

    // Verificar ganhadores reais
    const ganhadores = await verificarCartelasSala(sala.id)

    // Buscar usuários fake configurados
    const usuariosFake = (sala.usuariosFakeVencedores as Array<{
      nome: string
      tipo: 'linha' | 'coluna' | 'diagonal' | 'bingo'
      avatar?: string
    }>) || []

    // Processar resultados e prêmios
    const resultados: Array<{
      tipo: string
      cartelasGanhadoras: number[]
      premioTotal: number
      usuariosFake?: Array<{ nome: string; avatar?: string }>
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

      // Adicionar usuários fake do tipo bingo se configurados
      const usuariosFakeBingo = usuariosFake.filter((u) => u.tipo === 'bingo').map((u) => ({
        nome: u.nome,
        avatar: u.avatar,
      }))

      resultados.push({
        tipo: 'bingo',
        cartelasGanhadoras: ganhadores.bingo,
        premioTotal: sala.premioBingo,
        usuariosFake: usuariosFakeBingo.length > 0 ? usuariosFakeBingo : undefined,
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

      // Adicionar usuários fake do tipo diagonal se configurados
      const usuariosFakeDiagonal = usuariosFake.filter((u) => u.tipo === 'diagonal').map((u) => ({
        nome: u.nome,
        avatar: u.avatar,
      }))

      resultados.push({
        tipo: 'diagonal',
        cartelasGanhadoras: ganhadores.diagonal,
        premioTotal: sala.premioDiagonal,
        usuariosFake: usuariosFakeDiagonal.length > 0 ? usuariosFakeDiagonal : undefined,
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

      // Adicionar usuários fake do tipo coluna se configurados
      const usuariosFakeColuna = usuariosFake.filter((u) => u.tipo === 'coluna').map((u) => ({
        nome: u.nome,
        avatar: u.avatar,
      }))

      resultados.push({
        tipo: 'coluna',
        cartelasGanhadoras: ganhadores.coluna,
        premioTotal: sala.premioColuna,
        usuariosFake: usuariosFakeColuna.length > 0 ? usuariosFakeColuna : undefined,
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

      // Adicionar usuários fake do tipo linha se configurados
      const usuariosFakeLinha = usuariosFake.filter((u) => u.tipo === 'linha').map((u) => ({
        nome: u.nome,
        avatar: u.avatar,
      }))

      resultados.push({
        tipo: 'linha',
        cartelasGanhadoras: ganhadores.linha,
        premioTotal: sala.premioLinha,
        usuariosFake: usuariosFakeLinha.length > 0 ? usuariosFakeLinha : undefined,
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
