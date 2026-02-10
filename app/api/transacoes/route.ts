import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { parseSessionToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/** GET - Lista transações do usuário (depósitos + saques) */
export async function GET(request: NextRequest) {
  try {
    const session = cookies().get('lotbicho_session')?.value
    const user = parseSessionToken(session)
    if (!user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filtro = searchParams.get('filtro') || 'todas' // todas | depositos | saques
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(50, Math.max(10, parseInt(searchParams.get('limit') || '20', 10)))
    const offset = (page - 1) * limit

    const transacoes: Array<{
      id: string
      origem: 'transacao' | 'saque'
      tipo: string
      valor: number
      status: string
      data: string
      pagoEm?: string
      descricao?: string
    }> = []

    // Depósitos e bônus (Transacao)
    if (filtro === 'todas' || filtro === 'depositos') {
      const where: { usuarioId: number; tipo?: string | { in: string[] } } = { usuarioId: user.id }
      // Depósitos inclui deposito e bonus_promotor
      where.tipo = { in: ['deposito', 'bonus_promotor'] }

      const take = filtro === 'todas' ? 100 : limit + offset
      const trans = await prisma.transacao.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip: filtro === 'depositos' ? offset : 0,
      })

      for (const t of trans) {
        const tipoLabel = t.tipo === 'bonus_promotor' ? 'Bônus indicação' : 'Depósito'
        transacoes.push({
          id: `t-${t.id}`,
          origem: 'transacao',
          tipo: tipoLabel,
          valor: t.valor,
          status: t.status === 'pago' ? 'Pago' : t.status === 'falhou' ? 'Falhou' : 'Pendente',
          data: t.createdAt.toISOString(),
          pagoEm: t.status === 'pago' ? t.updatedAt.toISOString() : undefined,
          descricao: t.descricao || undefined,
        })
      }
    }

    // Saques
    if (filtro === 'todas' || filtro === 'saques') {
      const take = filtro === 'todas' ? 100 : limit + offset
      const saques = await prisma.saque.findMany({
        where: { usuarioId: user.id },
        orderBy: { createdAt: 'desc' },
        take,
        skip: filtro === 'saques' ? offset : 0,
      })

      for (const s of saques) {
        const statusLabel =
          s.status === 'aprovado' ? 'Pago' :
          s.status === 'rejeitado' ? 'Rejeitado' :
          s.status === 'processando' ? 'Processando' : 'Pendente'
        transacoes.push({
          id: `s-${s.id}`,
          origem: 'saque',
          tipo: 'Saque',
          valor: -s.valor,
          status: statusLabel,
          data: s.createdAt.toISOString(),
          pagoEm: s.status === 'aprovado' ? (s.updatedAt?.toISOString?.() || s.createdAt.toISOString()) : undefined,
        })
      }
    }

    // Ordenar por data (mais recente primeiro) e paginar
    transacoes.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    const paginated = transacoes.slice(offset, offset + limit)

    return NextResponse.json({
      transacoes: paginated,
      total: transacoes.length,
      page,
      limit,
    })
  } catch (error) {
    console.error('Erro ao listar transações:', error)
    return NextResponse.json({ error: 'Erro ao carregar transações' }, { status: 500 })
  }
}
