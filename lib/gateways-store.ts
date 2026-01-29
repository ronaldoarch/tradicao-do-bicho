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
  
  if (!current) {
    throw new Error('Gateway não encontrado')
  }
  
  const type = input.type || current.type || 'suitpay'
  
  // Criptografar senha se for Gatebox e foi fornecida nova senha
  let passwordEncrypted: string | null = current.password || null
  
  if (type === 'gatebox' && input.password !== undefined) {
    // Se senha foi fornecida e não é '***' nem vazia, é nova senha
    if (input.password && input.password !== '***' && input.password.trim() !== '') {
      console.log('🔐 Atualizando senha do gateway Gatebox')
      passwordEncrypted = encrypt(input.password)
    } else {
      // Se for '***' ou vazio, mantém a senha atual
      console.log('🔐 Mantendo senha atual do gateway')
      passwordEncrypted = current.password || null
    }
  }

  const updateData: any = {
    name: input.name !== undefined ? input.name : current.name,
    type: input.type !== undefined ? input.type : current.type,
    baseUrl: input.baseUrl !== undefined ? input.baseUrl : current.baseUrl,
    apiKey: input.apiKey !== undefined ? input.apiKey : current.apiKey,
    username: input.username !== undefined ? input.username : current.username,
    password: passwordEncrypted,
    sandbox: input.sandbox !== undefined ? input.sandbox : current.sandbox,
    active: input.active !== undefined ? input.active : current.active,
  }

  console.log('💾 Atualizando gateway:', { id, type, temSenha: !!updateData.password })

  return prisma.gateway.update({
    where: { id },
    data: updateData,
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
