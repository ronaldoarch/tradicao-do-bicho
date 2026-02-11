import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/admin-auth'
import { getFrkConfigForClient } from '@/lib/frk-store'
import { FrkApiClient, mapearTipoJogoFRK, mapearPremioFRK } from '@/lib/frk-api-client'
import { buscarEstatisticasDescarga } from '@/lib/descarga-helpers'
import { prisma } from '@/lib/prisma'

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

    // VALIDAÇÃO: Verificar limites de descarga antes de enviar para FRK
    console.log('🔍 Verificando limites de descarga antes de enviar para FRK...')
    const dataConcursoDate = dataJogo ? new Date(dataJogo + 'T00:00:00') : null
    
    // Agrupar apostas por modalidade e prêmio para verificar limites
    const apostasPorLimite = new Map<string, { modalidade: string; premio: number; valor: number }>()
    
    for (const aposta of apostas) {
      const modalidade = aposta.modalidade || 'GRUPO'
      const premio = aposta.premio || 1
      const valor = aposta.valor || 0
      const key = `${modalidade}_${premio}`
      
      if (apostasPorLimite.has(key)) {
        const existente = apostasPorLimite.get(key)!
        existente.valor += valor
      } else {
        apostasPorLimite.set(key, { modalidade, premio, valor })
      }
    }

    // Verificar limites para cada combinação modalidade/prêmio
    const limitesUltrapassados: Array<{ modalidade: string; premio: number; limite: number; totalApostado: number; excedente: number }> = []
    
    for (const [key, dados] of Array.from(apostasPorLimite.entries())) {
      // Buscar limite configurado
      const limiteConfig = await prisma.limiteDescarga.findFirst({
        where: {
          modalidade: dados.modalidade,
          premio: dados.premio,
          loteria: '',
          horario: '',
          ativo: true,
        },
      })

      if (limiteConfig) {
        // Calcular total já apostado usando a função helper (considera apenas apostas que cobrem o prêmio)
        const { calcularTotalApostadoPorPremio } = await import('@/lib/descarga-helpers')
        const totalApostado = await calcularTotalApostadoPorPremio(
          dados.modalidade,
          dados.premio,
          dataConcursoDate || null
        )

        const totalComDescarga = totalApostado + dados.valor
        const ultrapassou = totalComDescarga > limiteConfig.limite
        const excedente = ultrapassou ? totalComDescarga - limiteConfig.limite : 0

        if (ultrapassou) {
          limitesUltrapassados.push({
            modalidade: dados.modalidade,
            premio: dados.premio,
            limite: limiteConfig.limite,
            totalApostado: totalComDescarga,
            excedente,
          })
        }

        console.log(`📊 Limite ${dados.modalidade} ${dados.premio}º: Total atual R$ ${totalApostado.toFixed(2)}, com descarga R$ ${totalComDescarga.toFixed(2)}, limite R$ ${limiteConfig.limite.toFixed(2)}, ${ultrapassou ? '⚠️ ULTRAPASSOU' : '✅ OK'}`)
      }
    }

    // Se houver limites ultrapassados, retornar aviso (mas permitir continuar se admin quiser)
    if (limitesUltrapassados.length > 0) {
      console.warn('⚠️ Limites de descarga ultrapassados:', limitesUltrapassados)
      // Não bloquear, apenas avisar - admin pode querer descarregar mesmo assim
      // Mas vamos retornar um aviso para que o admin saiba
    }

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

    // IMPORTANTE: Buscar extrações para obter horário de bloqueio
    // Conforme orientação: "Horário Bloqueio (aconselho enviar 3min antes desse horário)"
    let horarioBloqueio: string | null = null
    let usarHorarioBloqueio = false
    
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
        
        if (extracaoEncontrada.chrHorarioBloqueio && extracaoEncontrada.tnySituacao === 1) {
          horarioBloqueio = extracaoEncontrada.chrHorarioBloqueio
          console.log(`ℹ️ Usando horário de bloqueio: ${horarioBloqueio} (enviar 3min antes)`)
          usarHorarioBloqueio = true
        } else if (extracaoEncontrada.tnySituacao !== 1) {
          console.warn(`⚠️ Extração ${extracao} encontrada mas não está ativa (situação: ${extracaoEncontrada.tnySituacao})`)
        }
      } else {
        console.warn(`⚠️ Extração ${extracao} não encontrada nas extrações disponíveis para ${dataJogo}`)
        console.log(`ℹ️ Extrações disponíveis:`, extracoes.map((e: any) => ({
          numero: e.tnyExtracao,
          descricao: e.vchDescricao,
          horario: e.chrHorario,
          horarioBloqueio: e.chrHorarioBloqueio,
          situacao: e.tnySituacao,
        })))
      }
    } catch (error: any) {
      console.warn('⚠️ Não foi possível buscar extrações (continuando mesmo assim):', error.message)
    }

    // Se encontrou horário de bloqueio, calcular horário para envio (3 minutos antes)
    let dataHoraParaEnvio = dataHora
    if (usarHorarioBloqueio && horarioBloqueio) {
      try {
        // Parse do horário de bloqueio (formato HH:mm)
        const [horaBloqueio, minutoBloqueio] = horarioBloqueio.split(':').map(Number)
        
        // Criar data com horário de bloqueio
        const [ano, mes, dia] = dataJogo.includes('/') 
          ? dataJogo.split('/').reverse() 
          : dataJogo.split('-')
        const dataBloqueio = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia), horaBloqueio, minutoBloqueio)
        
        // Subtrair 3 minutos
        dataBloqueio.setMinutes(dataBloqueio.getMinutes() - 3)
        
        // Formatar para YYYY-MM-DD HH:mm
        const anoFormatado = String(dataBloqueio.getFullYear())
        const mesFormatado = String(dataBloqueio.getMonth() + 1).padStart(2, '0')
        const diaFormatado = String(dataBloqueio.getDate()).padStart(2, '0')
        const horaFormatada = String(dataBloqueio.getHours()).padStart(2, '0')
        const minutoFormatado = String(dataBloqueio.getMinutes()).padStart(2, '0')
        
        dataHoraParaEnvio = `${anoFormatado}-${mesFormatado}-${diaFormatado} ${horaFormatada}:${minutoFormatado}`
        
        console.log(`⏰ Ajustando horário conforme orientação:`)
        console.log(`   - Horário de bloqueio: ${horarioBloqueio}`)
        console.log(`   - Horário para envio (3min antes): ${dataHoraParaEnvio}`)
      } catch (error: any) {
        console.warn(`⚠️ Erro ao calcular horário de bloqueio menos 3min: ${error.message}`)
        console.log(`   Usando horário original: ${dataHora}`)
      }
    }

    // Efetuar descarga
    // Usar horário ajustado (bloqueio - 3min) se disponível, senão usar o original
    const resultado = await client.efetuarDescarga({
      sdtDataJogo: dataJogo,
      sdtDataHora: dataHoraParaEnvio,
      tnyExtracao: extracao,
      sntQuantidadeApostas: quantidadeApostas,
      numValorApostas: valorTotal,
      sdtDataHoraTerminal: dataHoraParaEnvio, // Usar mesmo horário ajustado
      arrApostas,
      arrExtracaoData: [],
    })

    console.log('✅ Descarga efetuada com sucesso:', resultado)

    return NextResponse.json({
      success: true,
      resultado,
      message: `Descarga efetuada com sucesso. Pule: ${resultado.intNumeroPule}`,
      avisos: limitesUltrapassados.length > 0 ? {
        limitesUltrapassados,
        mensagem: `${limitesUltrapassados.length} limite(s) ultrapassado(s). Descarga realizada mesmo assim.`,
      } : undefined,
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
