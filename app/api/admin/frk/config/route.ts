import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/admin-auth'
import { getFrkConfig, saveFrkConfig } from '@/lib/frk-store'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/frk/config
 * Busca configuração FRK
 */
export async function GET(request: NextRequest) {
  const adminCheck = await requireAdminAPI(request)
  if (adminCheck instanceof NextResponse) {
    return adminCheck
  }

  try {
    const config = await getFrkConfig()
    
    if (!config) {
      return NextResponse.json({ 
        config: null,
        message: 'Configuração FRK não encontrada'
      })
    }

    // Retornar configuração sem valores sensíveis completos
    return NextResponse.json({
      config: {
        baseUrl: config.baseUrl,
        sistemaId: config.sistemaId,
        clienteId: config.clienteId,
        bancaId: config.bancaId,
        grant: config.grant ? '***' : null,
        codigoIntegrador: config.codigoIntegrador ? '***' : null,
        chrSerial: config.chrSerial || null,
        chrCodigoPonto: config.chrCodigoPonto || null,
        chrCodigoOperador: config.chrCodigoOperador || null,
        vchVersaoTerminal: config.vchVersaoTerminal || '1.0.0',
      },
    })
  } catch (error) {
    console.error('Erro ao buscar configuração FRK:', error)
    return NextResponse.json({ error: 'Erro ao buscar configuração' }, { status: 500 })
  }
}

/**
 * POST /api/admin/frk/config
 * Salva configuração FRK
 */
export async function POST(request: NextRequest) {
  const adminCheck = await requireAdminAPI(request)
  if (adminCheck instanceof NextResponse) {
    return adminCheck
  }

  try {
    const body = await request.json()
    const {
      baseUrl,
      grant,
      codigoIntegrador,
      sistemaId,
      clienteId,
      bancaId,
      chrSerial,
      chrCodigoPonto,
      chrCodigoOperador,
      vchVersaoTerminal,
    } = body

    if (!baseUrl || !grant || !codigoIntegrador || !clienteId || !bancaId) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: baseUrl, grant, codigoIntegrador, clienteId, bancaId' },
        { status: 400 }
      )
    }

    await saveFrkConfig({
      baseUrl,
      grant,
      codigoIntegrador,
      sistemaId: sistemaId || 9,
      clienteId,
      bancaId,
      chrSerial,
      chrCodigoPonto,
      chrCodigoOperador,
      vchVersaoTerminal,
    })

    return NextResponse.json({ 
      message: 'Configuração FRK salva com sucesso',
    })
  } catch (error) {
    console.error('Erro ao salvar configuração FRK:', error)
    return NextResponse.json({ error: 'Erro ao salvar configuração' }, { status: 500 })
  }
}
