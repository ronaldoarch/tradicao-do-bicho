import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/admin-auth'
import { gerarPDFRelatorioFRK } from '@/lib/frk-relatorio-pdf'
import { getFrkConfigForClient } from '@/lib/frk-store'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/frk/relatorio-pdf
 * Gera PDF com relatório de descarga FRK
 */
export async function POST(request: NextRequest) {
  const adminCheck = await requireAdminAPI(request)
  if (adminCheck instanceof NextResponse) {
    return adminCheck
  }

  try {
    const body = await request.json()
    const {
      dataJogo, // "YYYY-MM-DD"
      dataHora, // "YYYY-MM-DD HH:mm"
      extracao, // número da extração
      apostas, // array de apostas
    } = body

    if (!dataJogo || !dataHora || !extracao || !apostas || !Array.isArray(apostas)) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: dataJogo, dataHora, extracao, apostas' },
        { status: 400 }
      )
    }

    // Buscar configuração FRK (opcional, para incluir no relatório)
    let config = null
    try {
      const configData = await getFrkConfigForClient()
      if (configData) {
        config = {
          baseUrl: configData.baseUrl,
          codigoIntegrador: configData.CodigoIntegrador || '',
          clienteId: configData.Cliente_ID || 0,
          bancaId: configData.Banca_ID || 0,
          chrSerial: configData.chrSerial || undefined,
          chrCodigoPonto: configData.chrCodigoPonto || undefined,
          chrCodigoOperador: configData.chrCodigoOperador || undefined,
        }
      }
    } catch (error) {
      // Ignorar erro ao buscar config, não é obrigatório para gerar PDF
      console.warn('Não foi possível carregar configuração FRK:', error)
    }

    // Gerar PDF
    const pdfBuffer = await gerarPDFRelatorioFRK({
      dataJogo,
      dataHora,
      extracao,
      apostas,
      config: config || undefined,
    })

    // Retornar PDF
    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="relatorio_descarga_frk_${dataJogo}_${extracao}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('Erro ao gerar PDF relatório FRK:', error)
    return NextResponse.json(
      {
        error: 'Erro ao gerar PDF',
        message: error.message || 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}
