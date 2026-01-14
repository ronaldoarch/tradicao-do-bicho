import { cookies } from 'next/headers'
import { parseSessionToken } from './auth'
import { prisma } from './prisma'

export interface AdminSessionPayload {
  id: number
  email: string
  nome: string
  isAdmin: boolean
}

const ADMIN_SESSION_COOKIE = 'admin_session'

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value
    
    if (!token) return null

    const payload = parseSessionToken(token) as AdminSessionPayload | undefined
    if (!payload || !payload.isAdmin) return null

    // Verificar se o usuário ainda é admin no banco
    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, nome: true, isAdmin: true, ativo: true },
    })

    if (!usuario || !usuario.isAdmin || !usuario.ativo) {
      return null
    }

    return {
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      isAdmin: true,
    }
  } catch (error) {
    console.error('Erro ao verificar sessão admin:', error)
    return null
  }
}

export async function requireAdmin(): Promise<AdminSessionPayload> {
  const session = await getAdminSession()
  if (!session) {
    throw new Error('Unauthorized: Admin access required')
  }
  return session
}
