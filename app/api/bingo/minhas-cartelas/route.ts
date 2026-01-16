import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { parseSessionToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/bingo/minhas-cartelas
 * Lista cartelas do usuário
 */
export async function GET(request: NextRequest) {
  const session = cookies().get('lotbicho_session')?.value
  const user = parseSessionToken(session)

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const salaId = searchParams.get('salaId')

    const where: any = {
      usuarioId: user.id,
    }

    if (salaId) {
      where.salaId = Number(salaId)
    }

    const cartelas = await prisma.cartelaBingo.findMany({
      where,
      include: {
        sala: {
          select: {
            id: true,
            nome: true,
            emAndamento: true,
            numerosSorteados: true,
            resultadoFinal: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ cartelas })
  } catch (error) {
    console.error('Erro ao buscar cartelas:', error)
    return NextResponse.json({ error: 'Erro ao carregar cartelas' }, { status: 500 })
  }
}
