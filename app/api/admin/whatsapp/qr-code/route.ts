import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getWhatsAppClient, getCurrentQRCode, isWhatsAppReady } from '@/lib/whatsapp-client'

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
    // Verificar se já está autenticado
    if (isWhatsAppReady()) {
      const client = await getWhatsAppClient()
      return NextResponse.json({
        autenticado: true,
        numero: client.info?.wid.user,
        nome: client.info?.pushname,
        mensagem: 'WhatsApp já está conectado',
        qrCode: null,
      })
    }

    // Tentar inicializar cliente (vai gerar QR code se necessário)
    // Não aguardar a promise completa, apenas iniciar o processo
    // Mas verificar se já está inicializando para evitar múltiplas inicializações
    const { getIsInitializing } = await import('@/lib/whatsapp-client')
    if (!getIsInitializing()) {
      getWhatsAppClient().catch(() => {
        // Cliente pode estar inicializando ou falhando, continuar
      })
    }

    // Buscar QR code atual
    const qrCode = getCurrentQRCode()

    if (qrCode) {
      return NextResponse.json({
        autenticado: false,
        qrCode: qrCode,
        mensagem: 'Escaneie o QR code com seu WhatsApp',
      })
    }

    // Se não houver QR code ainda, retornar status de aguardando
    return NextResponse.json({
      autenticado: false,
      qrCode: null,
      mensagem: 'Aguardando geração do QR code...',
    })
  } catch (error: any) {
    console.error('Erro ao verificar QR code do WhatsApp:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao verificar QR code' },
      { status: 500 }
    )
  }
}
