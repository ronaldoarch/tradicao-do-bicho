import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
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
  const parts = encryptedText.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const encrypted = parts[1]
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

/**
 * GET /api/admin/gatebox/config
 * Busca a configuração do Gatebox
 */
export async function GET(request: NextRequest) {
  const adminCheck = await requireAdminAPI(request)
  if (adminCheck instanceof NextResponse) {
    return adminCheck
  }

  try {
    let config = await prisma.configuracaoGatebox.findFirst()

    // Se não existe, cria uma configuração padrão
    if (!config) {
      config = await prisma.configuracaoGatebox.create({
        data: {
          username: null,
          password: null,
          baseUrl: 'https://api.gatebox.com.br',
          ativo: false,
        },
      })
    }

    // Decriptografar senha se existir
    const configResponse = {
      ...config,
      password: config.password ? '***' : null, // Não retornar senha real, apenas indicador
      passwordSet: !!config.password, // Indicar se senha está configurada
    }

    return NextResponse.json({ config: configResponse })
  } catch (error) {
    console.error('Erro ao buscar configuração do Gatebox:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar configuração' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/gatebox/config
 * Atualiza a configuração do Gatebox
 */
export async function POST(request: NextRequest) {
  const adminCheck = await requireAdminAPI(request)
  if (adminCheck instanceof NextResponse) {
    return adminCheck
  }

  try {
    const body = await request.json()
    const { username, password, baseUrl, ativo } = body

    // Buscar ou criar configuração
    let config = await prisma.configuracaoGatebox.findFirst()

    // Se password foi enviado e não é '***', criptografar
    let passwordEncrypted = config?.password || null
    if (password && password !== '***') {
      passwordEncrypted = encrypt(password)
    }

    if (config) {
      config = await prisma.configuracaoGatebox.update({
        where: { id: config.id },
        data: {
          username: username !== undefined ? username : config.username,
          password: passwordEncrypted !== null ? passwordEncrypted : config.password,
          baseUrl: baseUrl !== undefined ? baseUrl : config.baseUrl,
          ativo: ativo !== undefined ? Boolean(ativo) : config.ativo,
        },
      })
    } else {
      config = await prisma.configuracaoGatebox.create({
        data: {
          username: username || null,
          password: passwordEncrypted,
          baseUrl: baseUrl || 'https://api.gatebox.com.br',
          ativo: ativo !== undefined ? Boolean(ativo) : false,
        },
      })
    }

    // Não retornar senha real
    const configResponse = {
      ...config,
      password: config.password ? '***' : null,
      passwordSet: !!config.password,
    }

    return NextResponse.json({
      message: 'Configuração salva com sucesso',
      config: configResponse,
    })
  } catch (error) {
    console.error('Erro ao salvar configuração do Gatebox:', error)
    return NextResponse.json(
      { error: 'Erro ao salvar configuração' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/gatebox/config/decrypt
 * Retorna a senha descriptografada (apenas para uso interno)
 */
export async function getDecryptedPassword(): Promise<string | null> {
  try {
    const config = await prisma.configuracaoGatebox.findFirst()
    if (!config || !config.password) {
      return null
    }
    return decrypt(config.password)
  } catch (error) {
    console.error('Erro ao descriptografar senha:', error)
    return null
  }
}
