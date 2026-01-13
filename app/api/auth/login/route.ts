import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSessionToken, hashPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body || {}

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })
    }

    const user = await prisma.usuario.findUnique({
      where: { email },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        saldo: true,
        bonus: true,
        bonusBloqueado: true,
        bonusSemanal: true,
        passwordHash: true,
      },
    })

    if (!user || !user.passwordHash || user.passwordHash !== hashPassword(password)) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    const token = createSessionToken({ id: user.id, email: user.email, nome: user.nome })
    const { passwordHash, ...safeUser } = user

    const res = NextResponse.json({ user: safeUser, message: 'Login realizado com sucesso' })
    res.cookies.set('lotbicho_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
    return res
  } catch (error) {
    console.error('Erro ao logar:', error)
    return NextResponse.json({ error: 'Erro ao logar' }, { status: 500 })
  }
}
