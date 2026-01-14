import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { hashPassword, createSessionToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })
    }

    // Buscar usuário
    const usuario = await prisma.usuario.findUnique({
      where: { email },
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    // Verificar se é admin
    if (!usuario.isAdmin) {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem acessar.' }, { status: 403 })
    }

    // Verificar se está ativo
    if (!usuario.ativo) {
      return NextResponse.json({ error: 'Conta desativada' }, { status: 403 })
    }

    // Verificar senha
    if (!usuario.passwordHash) {
      return NextResponse.json({ error: 'Senha não configurada. Entre em contato com o suporte.' }, { status: 401 })
    }

    const passwordHash = hashPassword(password)
    if (passwordHash !== usuario.passwordHash) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    // Criar sessão
    const sessionPayload = {
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      isAdmin: true,
    }

    const token = createSessionToken(sessionPayload)

    // Definir cookie
    const cookieStore = await cookies()
    cookieStore.set('admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: '/',
    })

    return NextResponse.json({
      success: true,
      user: {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        isAdmin: true,
      },
    })
  } catch (error) {
    console.error('Erro no login admin:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
