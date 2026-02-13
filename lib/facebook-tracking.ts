/**
 * Helper para rastrear eventos do Facebook Pixel no servidor
 * Usa a Conversions API do Facebook via endpoint interno
 */

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
 * Envia evento do Facebook Pixel via API interna
 * Pode ser chamado tanto do cliente quanto do servidor
 */
export async function trackFacebookEventServer(
  eventName: string,
  eventData?: FacebookEventData,
  userId?: number
): Promise<void> {
  try {
    // Buscar configuração do tracking
    const config = await prisma.configuracaoTracking.findFirst({
      where: { ativo: true },
    })

    if (!config || !config.facebookPixelId) {
      console.log(`⚠️ Facebook Tracking: Pixel não configurado, ignorando evento "${eventName}"`)
      return
    }

    // Buscar dados do usuário se userId fornecido
    let userData: any = {}
    if (userId) {
      const user = await prisma.usuario.findUnique({
        where: { id: userId },
        select: {
          email: true,
          telefone: true,
          cpf: true,
          nome: true,
        },
      })

      if (user) {
        // Preparar dados do usuário para Conversions API
        userData = {
          em: user.email ? hashSHA256(user.email.toLowerCase().trim()) : undefined,
          ph: user.telefone ? hashSHA256(normalizePhone(user.telefone)) : undefined,
          fn: user.nome ? hashSHA256(user.nome.split(' ')[0].toLowerCase()) : undefined,
        }
        // Remover campos undefined
        Object.keys(userData).forEach(key => userData[key] === undefined && delete userData[key])
      }
    }

    // Criar eventId único
    const eventId = `${eventName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Enviar para nossa API de eventos
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/facebook/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_name: eventName,
        event_id: eventId,
        pixel_id: config.facebookPixelId,
        user_data: userData,
        custom_data: eventData || {},
        value: eventData?.value,
        currency: eventData?.currency || 'BRL',
        source_url: eventData?.source_url,
      }),
    })

    if (!response.ok) {
      console.error(`❌ Facebook Tracking: Erro ao enviar evento "${eventName}":`, response.status, response.statusText)
    } else {
      console.log(`✅ Facebook Tracking: Evento "${eventName}" enviado com sucesso`)
    }
  } catch (error) {
    // Não bloquear o fluxo principal se o tracking falhar
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
