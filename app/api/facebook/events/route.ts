import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/facebook/events
 * Recebe eventos do Facebook Pixel/Conversions API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const headersList = request.headers
    
    // Extrair informações do evento
    const eventName = body.event_name || body.eventName || 'Unknown'
    const eventId = body.event_id || body.eventId || null
    const pixelId = body.pixel_id || body.pixelId || headersList.get('x-pixel-id') || null
    
    // Dados do usuário
    const userData = body.user_data || body.userData || {}
    const customData = body.custom_data || body.customData || {}
    
    // Valor e moeda
    const value = customData.value || body.value || null
    const currency = customData.currency || body.currency || 'BRL'
    
    // Informações da requisição
    const sourceUrl = headersList.get('referer') || body.source_url || body.sourceUrl || null
    const userAgent = headersList.get('user-agent') || null
    const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || 
                     headersList.get('x-real-ip') || 
                     null

    // Verificar se evento já existe (idempotência)
    if (eventId) {
      const existing = await prisma.facebookEvent.findUnique({
        where: { eventId: String(eventId) },
      })
      
      if (existing) {
        return NextResponse.json({ 
          success: true, 
          message: 'Evento já registrado',
          eventId: existing.id 
        }, { status: 200 })
      }
    }

    // Criar registro do evento
    const event = await prisma.facebookEvent.create({
      data: {
        eventName: String(eventName),
        eventId: eventId ? String(eventId) : null,
        pixelId: pixelId ? String(pixelId) : null,
        userData: userData,
        customData: customData,
        value: value ? Number(value) : null,
        currency: currency || 'BRL',
        sourceUrl: sourceUrl,
        userAgent: userAgent,
        ipAddress: ipAddress,
        status: 'received',
      },
    })

    return NextResponse.json({ 
      success: true, 
      eventId: event.id,
      message: 'Evento do Facebook registrado com sucesso' 
    }, { status: 200 })
  } catch (error) {
    console.error('Erro ao registrar evento do Facebook:', error)
    
    // Tentar registrar o erro
    try {
      await prisma.facebookEvent.create({
        data: {
          eventName: 'error',
          userData: { error: String(error) },
          status: 'failed',
          error: String(error),
        },
      })
    } catch (dbError) {
      console.error('Erro ao registrar erro no banco:', dbError)
    }

    return NextResponse.json({ 
      error: 'Erro ao processar evento',
      message: String(error)
    }, { status: 500 })
  }
}

/**
 * GET /api/facebook/events
 * Verificação do endpoint (para validação do Facebook)
 */
export async function GET(request: NextRequest) {
  const verifyToken = request.nextUrl.searchParams.get('hub.verify_token')
  const challenge = request.nextUrl.searchParams.get('hub.challenge')
  
  // Token de verificação (configure em variável de ambiente)
  const expectedToken = process.env.FACEBOOK_VERIFY_TOKEN || 'meu_token_secreto'
  
  if (verifyToken === expectedToken && challenge) {
    return new NextResponse(challenge, { status: 200 })
  }
  
  return NextResponse.json({ error: 'Token inválido' }, { status: 403 })
}
