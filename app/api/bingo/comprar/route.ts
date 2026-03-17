import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { parseSessionToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { gerarCartelaBingo } from '@/lib/bingo-helpers'

/**
 * POST /api/bingo/comprar
 * Compra uma cartela de bingo
 */
export async function POST(request: NextRequest) {
  const session = cookies().get('lotbicho_session')?.value
  const user = parseSessionToken(session)

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
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

    if (!sala.ativa) {
      return NextResponse.json({ error: 'Sala não está ativa' }, { status: 400 })
    }

    if (sala.emAndamento) {
      return NextResponse.json({ error: 'Não é possível comprar cartela após o início do bingo' }, { status: 400 })
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        saldo: true,
        saldoSacavel: true,
        rolloverAtual: true,
        rolloverNecessario: true,
        bonusBloqueado: true,
        bonus: true,
      },
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    if (usuario.saldo < sala.valorCartela) {
      return NextResponse.json({ error: 'Saldo insuficiente' }, { status: 400 })
    }

    // Gerar cartela
    const numerosCartela = gerarCartelaBingo()

    // Compra de cartela usa apenas saldo (dinheiro real) - conta para rollover
    const debitarSaldo = sala.valorCartela
    const novoRolloverAtual = usuario.rolloverAtual + debitarSaldo
    const rolloverCumprido =
      usuario.rolloverNecessario > 0 && novoRolloverAtual >= usuario.rolloverNecessario

    // Criar cartela e debitar saldo
    const result = await prisma.$transaction(async (tx) => {
      const debitarSaldoSacavel = Math.min(
        sala.valorCartela,
        Math.max(0, usuario.saldoSacavel ?? 0)
      )

      const updateData: Record<string, unknown> = {
        saldo: { decrement: sala.valorCartela },
        saldoSacavel: { decrement: debitarSaldoSacavel },
        rolloverAtual: novoRolloverAtual,
      }

      if (rolloverCumprido) {
        updateData.bonusBloqueado = 0
        updateData.bonus = { increment: usuario.bonusBloqueado }
        updateData.rolloverNecessario = 0
        console.log(
          `✅ Rollover cumprido (bingo) para usuário ${user.id}. Bônus liberado: R$ ${usuario.bonusBloqueado.toFixed(2)}`
        )
      }

      // Debitar saldo e atualizar rollover (compras de bingo contam para liberar bônus)
      await tx.usuario.update({
        where: { id: user.id },
        data: updateData,
      })

      // Criar cartela
      const cartela = await tx.cartelaBingo.create({
        data: {
          salaId: sala.id,
          usuarioId: user.id,
          numeros: numerosCartela as unknown as Prisma.InputJsonValue,
          valorPago: sala.valorCartela,
          status: 'ativa',
        },
      })

      return cartela
    })

    return NextResponse.json({ cartela: result })
  } catch (error) {
    console.error('Erro ao comprar cartela:', error)
    return NextResponse.json({ error: 'Erro ao comprar cartela' }, { status: 500 })
  }
}
