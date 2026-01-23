import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { isWhatsAppReady, getWhatsAppClientInstance } from '@/lib/whatsapp-client'

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
    // Verificar se cliente está pronto SEM chamar getWhatsAppClient() para evitar inicializações desnecessárias
    const ready = isWhatsAppReady()
    const client = getWhatsAppClientInstance()
    
    if (ready && client) {
      try {
        // Usar cliente existente diretamente, sem chamar getWhatsAppClient()
        
        // Verificação adicional: garantir que wid existe
        if (!client.info || !client.info.wid || !client.info.wid.user) {
          return NextResponse.json({
            conectado: false,
            mensagem: 'WhatsApp não está completamente autenticado. Por favor, reconecte.',
          })
        }
        
        return NextResponse.json({
          conectado: true,
          numero: client.info.wid.user,
          nome: client.info.pushname || 'N/A',
          plataforma: client.info.platform || 'N/A',
        })
      } catch (error) {
        // Se houver erro ao verificar cliente, considerar desconectado
        return NextResponse.json({
          conectado: false,
          mensagem: 'Erro ao verificar status do cliente WhatsApp.',
        })
      }
    }

    // NÃO tentar inicializar automaticamente aqui para evitar múltiplas inicializações
    // O usuário deve clicar em "Conectar WhatsApp" explicitamente

    return NextResponse.json({
      conectado: false,
      mensagem: 'WhatsApp não está conectado. Clique em "Conectar WhatsApp" para gerar o QR code.',
    })
  } catch (error: any) {
    console.error('Erro ao verificar status do WhatsApp:', error)
    return NextResponse.json(
      {
        conectado: false,
        mensagem: error.message || 'Erro ao verificar status',
      },
      { status: 500 }
    )
  }
}
