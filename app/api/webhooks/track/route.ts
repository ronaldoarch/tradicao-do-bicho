import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

/**
 * POST /api/webhooks/track
 * Endpoint genérico para rastrear webhooks de qualquer origem
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const headersList = await headers()
    
    // Extrair informações do webhook
    const source = headersList.get('x-webhook-source') || 
                   headersList.get('x-source') || 
                   request.nextUrl.searchParams.get('source') ||
                   'unknown'
    
    const eventType = headersList.get('x-event-type') || 
                     headersList.get('x-event') ||
                     body.event || 
                     body.type ||
                     'unknown'

    // Capturar todos os headers relevantes
    const relevantHeaders: Record<string, string> = {}
    headersList.forEach((value, key) => {
      if (key.toLowerCase().startsWith('x-') || 
          key.toLowerCase() === 'authorization' ||
          key.toLowerCase() === 'content-type') {
        relevantHeaders[key] = value
      }
    })

    // Criar registro do evento
    const event = await prisma.webhookEvent.create({
      data: {
        source: String(source),
        eventType: String(eventType),
        payload: body,
        headers: relevantHeaders,
        status: 'received',
      },
    })

    return NextResponse.json({ 
      success: true, 
      eventId: event.id,
      message: 'Webhook registrado com sucesso' 
    }, { status: 200 })
  } catch (error) {
    console.error('Erro ao registrar webhook:', error)
    
    // Tentar registrar o erro
    try {
      await prisma.webhookEvent.create({
        data: {
          source: 'unknown',
          eventType: 'error',
          payload: { error: String(error) },
          status: 'failed',
          error: String(error),
        },
      })
    } catch (dbError) {
      console.error('Erro ao registrar erro no banco:', dbError)
    }

    return NextResponse.json({ 
      error: 'Erro ao processar webhook',
      message: String(error)
    }, { status: 500 })
  }
}
