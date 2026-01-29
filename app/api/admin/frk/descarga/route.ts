import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/admin-auth'
import { getFrkConfigForClient } from '@/lib/frk-store'
import { FrkApiClient, mapearTipoJogoFRK, mapearPremioFRK } from '@/lib/frk-api-client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/frk/descarga
 * Efetua descarga via API FRK
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

    // Buscar configuração
    const configData = await getFrkConfigForClient()
    if (!configData) {
      return NextResponse.json(
        { error: 'Configuração FRK não encontrada. Configure primeiro em Admin > Configurações > FRK' },
        { status: 400 }
      )
    }

    // Criar cliente
    const client = new FrkApiClient(configData)

    // Calcular total de apostas e valor
    const quantidadeApostas = apostas.length
    const valorTotal = apostas.reduce((sum: number, ap: any) => sum + (ap.valor || 0), 0)

    // Converter apostas para formato FRK
    const arrApostas = apostas.map((aposta: any) => ({
      sntTipoJogo: mapearTipoJogoFRK(aposta.modalidade || 'GRUPO', aposta.tipo || ''),
      vchNumero: aposta.numero || '',
      vchPremio: mapearPremioFRK(aposta.premio || 1),
      numValor: aposta.valor || 0,
      numValorTotal: aposta.valor || 0,
    }))

    // Efetuar descarga
    const resultado = await client.efetuarDescarga({
      sdtDataJogo: dataJogo,
      sdtDataHora: dataHora,
      tnyExtracao: extracao,
      sntQuantidadeApostas: quantidadeApostas,
      numValorApostas: valorTotal,
      sdtDataHoraTerminal: dataHora,
      arrApostas,
      arrExtracaoData: [],
    })

    return NextResponse.json({
      success: true,
      resultado,
      message: `Descarga efetuada com sucesso. Pule: ${resultado.intNumeroPule}`,
    })
  } catch (error: any) {
    console.error('Erro ao efetuar descarga FRK:', error)
    return NextResponse.json(
      { 
        error: 'Erro ao efetuar descarga',
        message: error.message || 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}
