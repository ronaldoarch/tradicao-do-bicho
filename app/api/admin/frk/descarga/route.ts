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

    console.log('📤 Recebida requisição de descarga:', { dataJogo, dataHora, extracao, apostas })

    if (!dataJogo || !dataHora || !extracao || !apostas || !Array.isArray(apostas)) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: dataJogo, dataHora, extracao, apostas' },
        { status: 400 }
      )
    }

    // Buscar configuração
    const configData = await getFrkConfigForClient()
    if (!configData) {
      console.error('❌ Configuração FRK não encontrada')
      return NextResponse.json(
        { error: 'Configuração FRK não encontrada. Configure primeiro em Admin > Configurações > FRK' },
        { status: 400 }
      )
    }

    // Validar campos obrigatórios da configuração
    if (!configData.grant || !configData.CodigoIntegrador || !configData.Cliente_ID || !configData.Banca_ID) {
      console.error('❌ Configuração FRK incompleta:', {
        temGrant: !!configData.grant,
        temCodigoIntegrador: !!configData.CodigoIntegrador,
        temCliente_ID: !!configData.Cliente_ID,
        temBanca_ID: !!configData.Banca_ID,
      })
      return NextResponse.json(
        { error: 'Configuração FRK incompleta. Verifique Grant, Código Integrador, Cliente ID e Banca ID' },
        { status: 400 }
      )
    }

    console.log('✅ Configuração FRK carregada:', {
      baseUrl: configData.baseUrl,
      temGrant: !!configData.grant,
      temCodigoIntegrador: !!configData.CodigoIntegrador,
      Cliente_ID: configData.Cliente_ID,
      Banca_ID: configData.Banca_ID,
      chrSerial: configData.chrSerial,
      chrCodigoPonto: configData.chrCodigoPonto,
      chrCodigoOperador: configData.chrCodigoOperador,
    })

    // Criar cliente
    const client = new FrkApiClient(configData)

    // Calcular total de apostas e valor
    const quantidadeApostas = apostas.length
    const valorTotal = apostas.reduce((sum: number, ap: any) => sum + (ap.valor || 0), 0)

    // Converter apostas para formato FRK
    const arrApostas = apostas.map((aposta: any) => {
      const tipoJogo = mapearTipoJogoFRK(aposta.modalidade || 'GRUPO', aposta.tipo || '')
      console.log(`📝 Convertendo aposta: modalidade=${aposta.modalidade}, tipoJogo=${tipoJogo}, numero=${aposta.numero}, premio=${aposta.premio}, valor=${aposta.valor}`)
      return {
        sntTipoJogo: tipoJogo,
        vchNumero: aposta.numero || '',
        vchPremio: mapearPremioFRK(aposta.premio || 1),
        numValor: aposta.valor || 0,
        numValorTotal: aposta.valor || 0,
      }
    })

    console.log('📋 Dados da descarga:', {
      sdtDataJogo: dataJogo,
      sdtDataHora: dataHora,
      tnyExtracao: extracao,
      sntQuantidadeApostas: quantidadeApostas,
      numValorApostas: valorTotal,
      arrApostas,
    })

    // Opcional: Buscar extrações disponíveis para validar antes de descarga
    // Isso pode ajudar a identificar se a extração está disponível
    try {
      // Converter data para formato YYYY-MM-DD se necessário
      let dataParaBusca = dataJogo
      if (dataJogo.includes('/')) {
        const [dia, mes, ano] = dataJogo.split('/')
        dataParaBusca = `${ano}-${mes}-${dia}`
      }
      
      const extracoes = await client.buscarExtracoes(dataParaBusca)
      const extracaoEncontrada = extracoes.find((e: any) => e.tnyExtracao === extracao)
      
      if (extracaoEncontrada) {
        console.log(`✅ Extração ${extracao} encontrada:`, {
          descricao: extracaoEncontrada.vchDescricao,
          horario: extracaoEncontrada.chrHorario,
          situacao: extracaoEncontrada.tnySituacao,
          horarioBloqueio: extracaoEncontrada.chrHorarioBloqueio,
        })
        
        // Se a extração tiver horário específico, podemos usar esse horário
        if (extracaoEncontrada.chrHorario && extracaoEncontrada.tnySituacao === 1) {
          console.log(`ℹ️ Extração ${extracao} está ativa com horário ${extracaoEncontrada.chrHorario}`)
        } else if (extracaoEncontrada.tnySituacao !== 1) {
          console.warn(`⚠️ Extração ${extracao} encontrada mas não está ativa (situação: ${extracaoEncontrada.tnySituacao})`)
        }
      } else {
        console.warn(`⚠️ Extração ${extracao} não encontrada nas extrações disponíveis para ${dataJogo}`)
        console.log(`ℹ️ Extrações disponíveis:`, extracoes.map((e: any) => ({
          numero: e.tnyExtracao,
          descricao: e.vchDescricao,
          horario: e.chrHorario,
          situacao: e.tnySituacao,
        })))
      }
    } catch (error: any) {
      console.warn('⚠️ Não foi possível buscar extrações (continuando mesmo assim):', error.message)
    }

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

    console.log('✅ Descarga efetuada com sucesso:', resultado)

    return NextResponse.json({
      success: true,
      resultado,
      message: `Descarga efetuada com sucesso. Pule: ${resultado.intNumeroPule}`,
    })
  } catch (error: any) {
    console.error('❌ Erro ao efetuar descarga FRK:', error)
    console.error('Stack trace:', error.stack)
    return NextResponse.json(
      { 
        error: 'Erro ao efetuar descarga',
        message: error.message || 'Erro desconhecido',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
