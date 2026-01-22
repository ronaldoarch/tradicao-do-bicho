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

    // Verificar saldo disponível (não pode sacar bônus bloqueado)
    const saldoDisponivelParaSaque = usuario.saldo
    
    if (valor > saldoDisponivelParaSaque) {
      return NextResponse.json(
        { error: 'Saldo insuficiente para saque' },
        { status: 400 }
      )
    }

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
