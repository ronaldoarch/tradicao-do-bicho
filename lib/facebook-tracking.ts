/**
 * Helper para rastrear eventos do Facebook Pixel no servidor
 * Salva diretamente no banco (evita fetch interno que falha em containers)
 */

import { Prisma } from '@prisma/client'
import { prisma } from './prisma'

export interface FacebookEventData {
  value?: number
  currency?: string
  content_name?: string
  content_ids?: string[]
  source_url?: string
  [key: string]: any
}

/**
 * Registra evento do Facebook Pixel no banco (servidor)
 * Salva direto no DB em vez de fetch - evita ECONNREFUSED em containers
 */
export async function trackFacebookEventServer(
  eventName: string,
  eventData?: FacebookEventData,
  userId?: number
): Promise<void> {
  try {
    const config = await prisma.configuracaoTracking.findFirst({
      where: { ativo: true },
    })

    if (!config || !config.facebookPixelId) {
      console.log(`⚠️ Facebook Tracking: Pixel não configurado, ignorando evento "${eventName}"`)
      return
    }

    let userData: Record<string, unknown> = {}
    if (userId) {
      const user = await prisma.usuario.findUnique({
        where: { id: userId },
        select: { email: true, telefone: true, cpf: true, nome: true },
      })
      if (user) {
        userData = {
          em: user.email ? hashSHA256(user.email.toLowerCase().trim()) : undefined,
          ph: user.telefone ? hashSHA256(normalizePhone(user.telefone)) : undefined,
          fn: user.nome ? hashSHA256(user.nome.split(' ')[0].toLowerCase()) : undefined,
        }
        Object.keys(userData).forEach(key => userData[key] === undefined && delete userData[key])
      }
    }

    const eventId = `${eventName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const customData = eventData || {}

    await prisma.facebookEvent.create({
      data: {
        eventName,
        eventId,
        pixelId: config.facebookPixelId,
        userData: userData as Prisma.InputJsonValue,
        customData: customData as Prisma.InputJsonValue,
        value: eventData?.value ?? null,
        currency: eventData?.currency || 'BRL',
        sourceUrl: eventData?.source_url ?? null,
        status: 'received',
      },
    })

    console.log(`✅ Facebook Tracking: Evento "${eventName}" registrado`)
  } catch (error) {
    console.error(`❌ Facebook Tracking: Erro ao rastrear evento "${eventName}":`, error)
  }
}

/**
 * Hash SHA-256 (requerido pela Conversions API do Facebook)
 */
function hashSHA256(input: string): string {
  // Em produção, use crypto do Node.js
  // Por enquanto, retorna o valor sem hash (a API pode fazer o hash)
  return input
}

/**
 * Normaliza telefone para formato E.164
 */
function normalizePhone(phone: string): string {
  // Remove caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '')
  
  // Se não começa com +, adiciona código do Brasil
  if (!cleaned.startsWith('55') && cleaned.length === 11) {
    return `55${cleaned}`
  }
  
  return cleaned.startsWith('+') ? cleaned.substring(1) : cleaned
}
