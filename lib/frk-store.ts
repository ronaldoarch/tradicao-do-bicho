/**
 * Store para configuração da API FRK
 */

import { prisma } from './prisma'
import * as crypto from 'crypto'

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

export interface FrkConfigData {
  baseUrl: string
  grant: string
  codigoIntegrador: string
  sistemaId: number
  clienteId: number
  bancaId: number
  chrSerial?: string
  chrCodigoPonto?: string
  chrCodigoOperador?: string
  vchVersaoTerminal?: string
}

/**
 * Busca configuração FRK do banco
 */
export async function getFrkConfig(): Promise<FrkConfigData | null> {
  const config = await prisma.configuracaoFrk.findFirst({
    where: { ativo: true },
  })

  if (!config || !config.grant || !config.codigoIntegrador || !config.clienteId || !config.bancaId) {
    return null
  }

  return {
    baseUrl: config.baseUrl,
    grant: decrypt(config.grant),
    codigoIntegrador: decrypt(config.codigoIntegrador),
    sistemaId: config.sistemaId,
    clienteId: config.clienteId,
    bancaId: config.bancaId,
    chrSerial: config.chrSerial ? decrypt(config.chrSerial) : undefined,
    chrCodigoPonto: config.chrCodigoPonto ? decrypt(config.chrCodigoPonto) : undefined,
    chrCodigoOperador: config.chrCodigoOperador ? decrypt(config.chrCodigoOperador) : undefined,
    vchVersaoTerminal: config.vchVersaoTerminal,
  }
}

/**
 * Salva ou atualiza configuração FRK
 */
export async function saveFrkConfig(data: FrkConfigData): Promise<void> {
  // Desativar outras configurações
  await prisma.configuracaoFrk.updateMany({
    where: { ativo: true },
    data: { ativo: false },
  })

  // Criar ou atualizar configuração
  const existing = await prisma.configuracaoFrk.findFirst()

  if (existing) {
    await prisma.configuracaoFrk.update({
      where: { id: existing.id },
      data: {
        baseUrl: data.baseUrl,
        grant: encrypt(data.grant),
        codigoIntegrador: encrypt(data.codigoIntegrador),
        sistemaId: data.sistemaId,
        clienteId: data.clienteId,
        bancaId: data.bancaId,
        chrSerial: data.chrSerial ? encrypt(data.chrSerial) : null,
        chrCodigoPonto: data.chrCodigoPonto ? encrypt(data.chrCodigoPonto) : null,
        chrCodigoOperador: data.chrCodigoOperador ? encrypt(data.chrCodigoOperador) : null,
        vchVersaoTerminal: data.vchVersaoTerminal || '1.0.0',
        ativo: true,
      },
    })
  } else {
    await prisma.configuracaoFrk.create({
      data: {
        baseUrl: data.baseUrl,
        grant: encrypt(data.grant),
        codigoIntegrador: encrypt(data.codigoIntegrador),
        sistemaId: data.sistemaId,
        clienteId: data.clienteId,
        bancaId: data.bancaId,
        chrSerial: data.chrSerial ? encrypt(data.chrSerial) : null,
        chrCodigoPonto: data.chrCodigoPonto ? encrypt(data.chrCodigoPonto) : null,
        chrCodigoOperador: data.chrCodigoOperador ? encrypt(data.chrCodigoOperador) : null,
        vchVersaoTerminal: data.vchVersaoTerminal || '1.0.0',
        ativo: true,
      },
    })
  }
}

/**
 * Busca configuração FRK formatada para o cliente
 */
export async function getFrkConfigForClient() {
  const config = await getFrkConfig()
  if (!config) return null

  return {
    baseUrl: config.baseUrl,
    grant: config.grant,
    CodigoIntegrador: config.codigoIntegrador,
    Sistema_ID: config.sistemaId,
    Cliente_ID: config.clienteId,
    Banca_ID: config.bancaId,
    chrSerial: config.chrSerial,
    chrCodigoPonto: config.chrCodigoPonto,
    chrCodigoOperador: config.chrCodigoOperador,
    vchVersaoTerminal: config.vchVersaoTerminal,
  }
}
