import { prisma } from './prisma'
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production'
const ALGORITHM = 'aes-256-cbc'

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

function decrypt(encryptedText: string): string {
  try {
    const parts = encryptedText.split(':')
    const iv = Buffer.from(parts[0], 'hex')
    const encrypted = parts[1]
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    console.error('Erro ao descriptografar:', error)
    throw error
  }
}

export interface GatewayInput {
  id?: number
  name: string
  type?: string // "gatebox" ou "suitpay"
  baseUrl: string
  apiKey?: string // Para SuitPay
  username?: string // Para Gatebox
  password?: string // Para Gatebox (será criptografada)
  sandbox?: boolean
  active?: boolean
}

export async function listGateways() {
  return prisma.gateway.findMany({
    orderBy: { id: 'desc' },
  })
}

export async function createGateway(input: GatewayInput) {
  const type = input.type || 'suitpay'
  
  // Criptografar senha se for Gatebox
  let passwordEncrypted = input.password || null
  if (type === 'gatebox' && input.password && input.password !== '***') {
    passwordEncrypted = encrypt(input.password)
  }

  return prisma.gateway.create({
    data: {
      name: input.name,
      type,
      baseUrl: input.baseUrl,
      apiKey: input.apiKey || null,
      username: input.username || null,
      password: passwordEncrypted,
      sandbox: input.sandbox ?? true,
      active: input.active ?? true,
    },
  })
}

export async function updateGateway(id: number, input: Partial<GatewayInput>) {
  // Buscar gateway atual para manter senha se não foi alterada
  const current = await prisma.gateway.findUnique({ where: { id } })
  
  const type = input.type || current?.type || 'suitpay'
  
  // Criptografar senha se for Gatebox e foi fornecida nova senha
  let passwordEncrypted = current?.password || null
  if (type === 'gatebox' && input.password) {
    if (input.password !== '***') {
      // Nova senha fornecida
      passwordEncrypted = encrypt(input.password)
    }
    // Se for '***', mantém a senha atual (não altera)
  }

  return prisma.gateway.update({
    where: { id },
    data: {
      name: input.name,
      type: input.type,
      baseUrl: input.baseUrl,
      apiKey: input.apiKey,
      username: input.username,
      password: passwordEncrypted !== null ? passwordEncrypted : current?.password,
      sandbox: input.sandbox,
      active: input.active,
    },
  })
}

/**
 * Busca gateway ativo para depósitos PIX
 */
export async function getActiveGateway() {
  return prisma.gateway.findFirst({
    where: { active: true },
    orderBy: { createdAt: 'desc' }, // Mais recente primeiro
  })
}

/**
 * Obtém configuração do gateway para uso no cliente
 */
export async function getGatewayConfig(gateway: any) {
  if (!gateway) return null

  if (gateway.type === 'gatebox') {
    if (!gateway.username || !gateway.password) return null
    
    return {
      type: 'gatebox',
      username: gateway.username,
      password: decrypt(gateway.password),
      baseUrl: gateway.baseUrl,
    }
  } else {
    // SuitPay - apiKey contém "clientId|clientSecret"
    if (!gateway.apiKey) return null
    
    const [clientId, clientSecret] = gateway.apiKey.split('|')
    if (!clientId || !clientSecret) return null

    return {
      type: 'suitpay',
      clientId,
      clientSecret,
      baseUrl: gateway.baseUrl,
    }
  }
}

export async function deleteGateway(id: number) {
  return prisma.gateway.delete({ where: { id } })
}
