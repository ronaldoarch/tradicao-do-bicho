import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { parseSessionToken } from '@/lib/auth'

export async function GET() {
  try {
    const session = cookies().get('lotbicho_session')?.value
    const payload = parseSessionToken(session)
    if (!payload) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const user = await prisma.usuario.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        saldo: true,
        saldoSacavel: true,
        bonus: true,
        bonusBloqueado: true,
        bonusSemanal: true,
        isPromotor: true,
        codigoPromotor: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ user }, { status: 200 })
  } catch (error) {
    console.error('Erro ao obter usuário logado:', error)
    return NextResponse.json({ error: 'Erro ao obter usuário logado' }, { status: 500 })
  }
}
