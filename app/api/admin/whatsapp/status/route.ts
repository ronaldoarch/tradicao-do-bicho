import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getWhatsAppClient, isWhatsAppReady } from '@/lib/whatsapp-client'

/**
 * GET /api/admin/whatsapp/status
 * Retorna status da conexão WhatsApp
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
  } catch (error) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    const ready = isWhatsAppReady()
    
    if (ready) {
      const client = await getWhatsAppClient()
      return NextResponse.json({
        conectado: true,
        numero: client.info?.wid.user || 'N/A',
        nome: client.info?.pushname || 'N/A',
        plataforma: client.info?.platform || 'N/A',
      })
    }

    return NextResponse.json({
      conectado: false,
      mensagem: 'WhatsApp não está conectado. Inicializando...',
    })
  } catch (error: any) {
    console.error('Erro ao verificar status do WhatsApp:', error)
    return NextResponse.json(
      {
        conectado: false,
        error: error.message || 'Erro ao verificar status',
      },
      { status: 500 }
    )
  }
}
