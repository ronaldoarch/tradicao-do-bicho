import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const skip = (page - 1) * limit

    const usuarios = await prisma.usuario.findMany({
      orderBy: { id: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        saldo: true,
        bonus: true,
        bonusBloqueado: true,
        ativo: true,
        isPromotor: true,
        codigoPromotor: true,
        createdAt: true,
      },
    })

    const total = await prisma.usuario.count()

    return NextResponse.json({ 
      usuarios, 
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Erro ao listar usuários:', error)
    return NextResponse.json({ usuarios: [], total: 0, error: 'Erro ao listar usuários' }, { status: 500 })
  }
}
