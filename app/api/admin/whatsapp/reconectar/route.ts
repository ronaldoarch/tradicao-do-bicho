import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { reconectarWhatsApp, desconectarWhatsApp } from '@/lib/whatsapp-client'

/**
 * POST /api/admin/whatsapp/reconectar
 * Força reconexão do WhatsApp
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
  } catch (error) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    await reconectarWhatsApp()
    
    return NextResponse.json({
      success: true,
      mensagem: 'WhatsApp reconectado com sucesso. Aguarde alguns segundos e verifique o status.',
    })
  } catch (error: any) {
    console.error('Erro ao reconectar WhatsApp:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erro ao reconectar WhatsApp',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/whatsapp/reconectar
 * Desconecta o WhatsApp
 */
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin()
  } catch (error) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    await desconectarWhatsApp()
    
    return NextResponse.json({
      success: true,
      mensagem: 'WhatsApp desconectado com sucesso.',
    })
  } catch (error: any) {
    console.error('Erro ao desconectar WhatsApp:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erro ao desconectar WhatsApp',
      },
      { status: 500 }
    )
  }
}
