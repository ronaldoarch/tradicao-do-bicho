import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getWhatsAppClient } from '@/lib/whatsapp-client'

/**
 * GET /api/admin/whatsapp/qr-code
 * Retorna QR code para autenticação do WhatsApp
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
  } catch (error) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    // Inicializar cliente (vai gerar QR code se necessário)
    const client = await getWhatsAppClient()
    
    // Verificar se já está autenticado
    if (client.info) {
      return NextResponse.json({
        autenticado: true,
        numero: client.info.wid.user,
        nome: client.info.pushname,
        mensagem: 'WhatsApp já está conectado',
      })
    }

    // Se não estiver autenticado, o QR code será gerado no evento 'qr'
    // Por enquanto, retornar status de aguardando
    return NextResponse.json({
      autenticado: false,
      mensagem: 'Aguardando autenticação. Verifique os logs do servidor para ver o QR code.',
      instrucoes: [
        '1. Verifique os logs do servidor para ver o QR code',
        '2. Escaneie o QR code com seu WhatsApp',
        '3. Aguarde a confirmação de autenticação',
      ],
    })
  } catch (error: any) {
    console.error('Erro ao verificar status do WhatsApp:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao verificar status' },
      { status: 500 }
    )
  }
}
