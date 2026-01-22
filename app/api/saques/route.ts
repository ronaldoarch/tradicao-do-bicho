import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { parseSessionToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/saques
 * Cria uma solicitação de saque
 */
export async function POST(request: NextRequest) {
  try {
    const session = cookies().get('lotbicho_session')?.value
    const user = parseSessionToken(session)

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { valor } = body

    if (!valor || valor <= 0) {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 })
    }

    // Buscar usuário com dados completos
    const usuario = await prisma.usuario.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        saldo: true,
        saldoSacavel: true,
        bonus: true,
        bonusBloqueado: true,
        rolloverNecessario: true,
        rolloverAtual: true,
      },
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Verificar se tem rollover pendente
    const temRolloverPendente = usuario.rolloverNecessario > 0 && usuario.rolloverAtual < usuario.rolloverNecessario
    
    if (temRolloverPendente) {
      const faltaRollover = usuario.rolloverNecessario - usuario.rolloverAtual
      return NextResponse.json(
        { 
          error: 'Você ainda precisa completar o rollover antes de poder sacar.',
          detalhes: {
            rolloverNecessario: usuario.rolloverNecessario,
            rolloverAtual: usuario.rolloverAtual,
            faltaRollover,
            mensagem: `Você precisa apostar mais R$ ${faltaRollover.toFixed(2)} com dinheiro real antes de poder sacar.`
          }
        },
        { status: 400 }
      )
    }

    // IMPORTANTE: Apenas prêmios de apostas podem ser sacados
    // Bônus (liberado ou bloqueado) nunca é sacável
    const saldoDisponivelParaSaque = usuario.saldoSacavel || 0
    
    if (valor > saldoDisponivelParaSaque) {
      const saldoTotal = usuario.saldo
      const bonusTotal = (usuario.bonus || 0) + (usuario.bonusBloqueado || 0)
      const saldoNaoSacavel = saldoTotal - saldoDisponivelParaSaque
      
      return NextResponse.json(
        { 
          error: 'Saldo insuficiente para saque',
          detalhes: {
            saldoSacavel: saldoDisponivelParaSaque,
            saldoTotal,
            bonusTotal,
            saldoNaoSacavel,
            mensagem: `Você pode sacar apenas R$ ${saldoDisponivelParaSaque.toFixed(2)}. Bônus não pode ser sacado, apenas prêmios de apostas.`
          }
        },
        { status: 400 }
      )
    }
    
    // Debitar do saldo e saldoSacavel quando saque é criado
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        saldo: { decrement: valor },
        saldoSacavel: { decrement: valor },
      },
    })

    // Criar solicitação de saque
    const saque = await prisma.saque.create({
      data: {
        usuarioId: usuario.id,
        valor,
        status: 'pendente',
      },
    })

    return NextResponse.json({
      message: 'Solicitação de saque criada com sucesso',
      saque,
    })
  } catch (error) {
    console.error('Erro ao criar saque:', error)
    return NextResponse.json(
      { error: 'Erro ao criar saque' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/saques
 * Lista saques do usuário
 */
export async function GET() {
  try {
    const session = cookies().get('lotbicho_session')?.value
    const user = parseSessionToken(session)

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const saques = await prisma.saque.findMany({
      where: { usuarioId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ saques })
  } catch (error) {
    console.error('Erro ao buscar saques:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar saques' },
      { status: 500 }
    )
  }
}
