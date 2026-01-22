import crypto from 'node:crypto'

const AUTH_SECRET = process.env.AUTH_SECRET || 'dev-secret'

export function hashPassword(password: string) {
  return crypto.createHash('sha256').update(`${password}:${AUTH_SECRET}`).digest('hex')
}

export interface SessionPayload {
  id: number
  email: string
  nome: string
  isAdmin?: boolean
}

export function createSessionToken(payload: SessionPayload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

export function parseSessionToken(token?: string | null): SessionPayload | undefined {
  if (!token) return undefined
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    return JSON.parse(decoded) as SessionPayload
  } catch (error) {
    console.error('Erro ao decodificar sessão:', error)
    return undefined
  }
}

/**
 * Valida e limpa CPF (remove formatação, mantém apenas números)
 */
export function cleanCPF(cpf: string): string {
  return cpf.replace(/\D/g, '')
}

/**
 * Valida formato de CPF (11 dígitos)
 */
export function isValidCPFFormat(cpf: string): boolean {
  const cleaned = cleanCPF(cpf)
  return cleaned.length === 11 && /^\d{11}$/.test(cleaned)
}

/**
 * Verifica se o usuário é administrador
 */
export async function isAdmin(userId: number): Promise<boolean> {
  const { prisma } = await import('./prisma')
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    })
    return usuario?.isAdmin === true
  } catch (error) {
    console.error('Erro ao verificar se usuário é admin:', error)
    return false
  }
}
