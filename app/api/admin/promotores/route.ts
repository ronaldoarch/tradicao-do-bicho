import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { gerarCodigoPromotorUnico } from '@/lib/promotor-helpers'

/** GET - Lista promotores e usuários (para definir quem é promotor) */
export async function GET() {
  try {
    await requireAdmin()
    const promotores = await prisma.usuario.findMany({
      where: { isPromotor: true },
      select: {
        id: true,
        nome: true,
        email: true,
        codigoPromotor: true,
        _count: {
          select: { indicacoesComoPromotor: true },
        },
      },
      orderBy: { nome: 'asc' },
    })
    const indicacoesComDeposito = await prisma.indicacao.groupBy({
      by: ['promotorId'],
      _sum: { bonusPago: true },
      _count: { id: true },
      where: { dataPrimeiroDeposito: { not: null } },
    })
    const mapBonus = Object.fromEntries(indicacoesComDeposito.map((i) => [i.promotorId, i._sum.bonusPago || 0]))
    const mapTotalIndicados = Object.fromEntries(indicacoesComDeposito.map((i) => [i.promotorId, i._count.id]))

    const result = promotores.map((p) => ({
      ...p,
      bonusTotal: mapBonus[p.id] || 0,
      indicadosComDeposito: mapTotalIndicados[p.id] || 0,
      totalIndicados: p._count.indicacoesComoPromotor,
    }))

    return NextResponse.json({ promotores: result })
  } catch (error) {
    console.error('Erro ao listar promotores:', error)
    return NextResponse.json({ error: 'Erro ao listar promotores' }, { status: 500 })
  }
}