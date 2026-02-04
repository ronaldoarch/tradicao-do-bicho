import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/admin-auth'
import { getFrkConfigForClient } from '@/lib/frk-store'
import { FrkApiClient } from '@/lib/frk-api-client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/frk/test-auth
 * Testa autenticação na API FRK
 */
export async function POST(request: NextRequest) {
  const adminCheck = await requireAdminAPI(request)
  if (adminCheck instanceof NextResponse) {
    return adminCheck
  }

  try {
    // Buscar configuração FRK
    const config = await getFrkConfigForClient()

    if (!config) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Configuração FRK não encontrada. Configure primeiro em Admin > Configurações > FRK' 
        },
        { status: 400 }
      )
    }

    // Criar cliente e testar autenticação
    const client = new FrkApiClient(config)
    
    console.log('🧪 Testando autenticação FRK...')
    console.log('📋 Configuração:', {
      baseUrl: config.baseUrl,
      sistemaId: config.Sistema_ID,
      clienteId: config.Cliente_ID,
      codigoIntegrador: config.CodigoIntegrador ? '***' : 'não configurado',
      grant: config.grant ? '***' : 'não configurado',
    })

    const token = await client.authenticate()

    return NextResponse.json({
      success: true,
      message: 'Autenticação bem-sucedida!',
      data: {
        codResposta: '000',
        mensagem: 'Autenticação realizada com sucesso',
        accessToken: token,
        expiraEm: 3600, // 1 hora (padrão da API)
      },
    })
  } catch (error: any) {
    console.error('❌ Erro ao testar autenticação FRK:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro ao autenticar na API FRK',
      details: error.toString(),
    }, { status: 500 })
  }
}
