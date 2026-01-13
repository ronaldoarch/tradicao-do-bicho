import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSessionToken, hashPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nome, email, password, telefone } = body || {}

    if (!nome || !email || !password) {
      return NextResponse.json({ error: 'Nome, email e senha são obrigatórios' }, { status: 400 })
    }

    const existing = await prisma.usuario.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })
    }

    const passwordHash = hashPassword(password)

    const user = await prisma.usuario.create({
      data: {
        nome,
        email,
        telefone: telefone || null,
        passwordHash,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        saldo: true,
        bonus: true,
        bonusBloqueado: true,
        bonusSemanal: true,
      },
    })

    const token = createSessionToken({ id: user.id, email: user.email, nome: user.nome })
    const res = NextResponse.json({ user, message: 'Cadastro realizado com sucesso' })
    res.cookies.set('lotbicho_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    })
    return res
  } catch (error) {
    console.error('Erro ao cadastrar:', error)
    return NextResponse.json({ error: 'Erro ao cadastrar' }, { status: 500 })
  }
}
