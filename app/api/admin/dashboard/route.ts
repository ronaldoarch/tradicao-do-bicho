import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

/**
 * GET /api/admin/dashboard
 * 
 * Retorna estatísticas do dashboard com filtros opcionais de data
 * 
 * Query params:
 * - dataInicio: Data inicial (YYYY-MM-DD)
 * - dataFim: Data final (YYYY-MM-DD)
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação admin
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const dataInicio = searchParams.get('dataInicio')
    const dataFim = searchParams.get('dataFim')

    // Construir filtros de data
    const dateFilter: any = {}
    if (dataInicio || dataFim) {
      dateFilter.createdAt = {}
      if (dataInicio) {
        dateFilter.createdAt.gte = new Date(dataInicio + 'T00:00:00.000Z')
      }
      if (dataFim) {
        dateFilter.createdAt.lte = new Date(dataFim + 'T23:59:59.999Z')
      }
    }

    // Buscar estatísticas em paralelo
    const [
      totalUsuarios,
      totalSaquesPendentes,
      totalSaquesAprovados,
      totalDepositosAprovados,
      valorDepositosAprovados,
      totalPromocoesAtivas,
      saldoTotal,
      premiosPagar,
      configDescarga,
      apostasNoPeriodo,
      depositosNoPeriodo,
      saquesNoPeriodo,
    ] = await Promise.all([
      // Total de usuários
      prisma.usuario.count(),

      // Saques pendentes
      prisma.saque.count({
        where: { status: 'pendente' },
      }),

      // Saques aprovados (total geral)
      prisma.saque.count({
        where: { status: 'aprovado' },
      }),

      // Depósitos aprovados (quantidade)
      prisma.transacao.count({
        where: { tipo: 'deposito', status: 'pago' },
      }),

      // Depósitos aprovados (valor total)
      prisma.transacao.aggregate({
        where: { tipo: 'deposito', status: 'pago' },
        _sum: { valor: true },
      }),

      // Promoções ativas
      prisma.promocao.count({
        where: { active: true },
      }),

      // Saldo total da plataforma (soma de todos os saldos)
      prisma.usuario.aggregate({
        _sum: {
          saldo: true,
        },
      }),

      // Premiações a pagar: soma de retornoPrevisto de apostas pendentes (estimativa)
      prisma.aposta.aggregate({
        where: { status: 'pendente' },
        _sum: { retornoPrevisto: true },
      }),

      // Config descarga (para último envio de relatório)
      prisma.configuracaoDescarga.findFirst({
        where: { ativo: true },
        select: { ultimoEnvio: true },
      }),

      // Apostas no período
      prisma.aposta.count({
        where: dateFilter,
      }),

      // Depósitos no período
      prisma.transacao.count({
        where: {
          tipo: 'deposito',
          status: 'pago',
          ...dateFilter,
        },
      }),

      // Saques no período
      prisma.saque.count({
        where: {
          status: 'aprovado',
          ...dateFilter,
        },
      }),
    ])

    // Calcular totais financeiros no período
    const depositosTotal = await prisma.transacao.aggregate({
      where: {
        tipo: 'deposito',
        status: 'pago',
        ...dateFilter,
      },
      _sum: {
        valor: true,
      },
    })

    const saquesTotal = await prisma.saque.aggregate({
      where: {
        status: 'aprovado',
        ...dateFilter,
      },
      _sum: {
        valor: true,
      },
    })

    const apostasTotal = await prisma.aposta.aggregate({
      where: dateFilter,
      _sum: {
        valor: true,
      },
    })

    const premiosTotal = await prisma.aposta.aggregate({
      where: {
        status: 'liquidado',
        ...dateFilter,
      },
      _sum: {
        retornoPrevisto: true,
      },
    })

    return NextResponse.json({
      usuarios: totalUsuarios,
      saquesPendentes: totalSaquesPendentes,
      saquesAprovados: totalSaquesAprovados,
      depositosAprovados: totalDepositosAprovados,
      valorDepositosAprovados: valorDepositosAprovados._sum.valor || 0,
      promocoesAtivas: totalPromocoesAtivas,
      saldoTotal: saldoTotal._sum.saldo || 0,
      premiosPagar: premiosPagar._sum.retornoPrevisto || 0,
      ultimoRelatorioDescarga: configDescarga?.ultimoEnvio || null,
      periodo: {
        dataInicio: dataInicio || null,
        dataFim: dataFim || null,
        apostas: apostasNoPeriodo,
        depositos: depositosNoPeriodo,
        saques: saquesNoPeriodo,
        valorDepositos: depositosTotal._sum.valor || 0,
        valorSaques: saquesTotal._sum.valor || 0,
        valorApostas: apostasTotal._sum.valor || 0,
        valorPremios: premiosTotal._sum.retornoPrevisto || 0,
        lucroBruto: (depositosTotal._sum.valor || 0) - (saquesTotal._sum.valor || 0) - (premiosTotal._sum.retornoPrevisto || 0),
      },
    })
  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar estatísticas' },
      { status: 500 }
    )
  }
}
