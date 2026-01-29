/**
 * Integração automática de descarga via API FRK
 * 
 * Quando limites são ultrapassados, automaticamente efetua descarga via API FRK
 */

import { getFrkConfigForClient } from './frk-store'
import { FrkApiClient, mapearTipoJogoFRK, mapearPremioFRK } from './frk-api-client'
import { prisma } from './prisma'
import { extracoes } from '@/data/extracoes'

export interface ApostaParaDescarga {
  modalidade: string
  numero: string
  premio: number
  valor: number
  loteria?: string
  horario?: string
  dataConcurso?: Date
}

/**
 * Efetua descarga automática quando limite é ultrapassado
 */
export async function efetuarDescargaAutomatica(
  modalidade: string,
  premio: number,
  dataConcurso: Date | null = null
): Promise<{ success: boolean; message: string; pule?: number }> {
  try {
    // Verificar se configuração FRK está ativa
    const config = await getFrkConfigForClient()
    if (!config) {
      console.log('⚠️ Configuração FRK não encontrada. Descarga automática não será executada.')
      return {
        success: false,
        message: 'Configuração FRK não encontrada',
      }
    }

    // Buscar apostas pendentes para esta modalidade/prêmio/data
    const whereClause: any = {
      status: 'pendente',
      modalidade,
    }

    if (dataConcurso) {
      const inicioDia = new Date(dataConcurso)
      inicioDia.setHours(0, 0, 0, 0)
      const fimDia = new Date(dataConcurso)
      fimDia.setHours(23, 59, 59, 999)
      
      whereClause.dataConcurso = {
        gte: inicioDia,
        lte: fimDia,
      }
    }

    const apostasPendentes = await prisma.aposta.findMany({
      where: whereClause,
      include: {
        usuario: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    })

    if (apostasPendentes.length === 0) {
      return {
        success: false,
        message: 'Nenhuma aposta pendente encontrada para descarga',
      }
    }

    // Filtrar apostas que cobrem o prêmio específico
    const apostasFiltradas: ApostaParaDescarga[] = []
    
    for (const aposta of apostasPendentes) {
      // Verificar se a aposta cobre o prêmio
      const detalhes = aposta.detalhes as any
      if (detalhes?.betData) {
        const position = detalhes.betData.position || detalhes.betData.customPositionValue
        if (position) {
          // Parsear posição (ex: "1-5" ou "1")
          const match = position.toString().match(/(\d+)(?:-(\d+))?/)
          if (match) {
            const posFrom = parseInt(match[1], 10)
            const posTo = match[2] ? parseInt(match[2], 10) : posFrom
            
            // Verificar se o prêmio está no intervalo
            if (premio >= posFrom && premio <= posTo) {
              // Extrair número apostado
              const numero = detalhes.betData.numbers?.[0] || detalhes.betData.number || ''
              
              // Buscar loteria e horário
              let loteriaNome = aposta.loteria || ''
              let horarioNome = aposta.horario || ''
              
              // Se loteria é ID, buscar nome
              if (/^\d+$/.test(loteriaNome)) {
                const extracao = extracoes.find(e => e.id === parseInt(loteriaNome, 10))
                if (extracao) {
                  loteriaNome = extracao.name
                  horarioNome = extracao.time
                }
              }

              apostasFiltradas.push({
                modalidade: aposta.modalidade,
                numero: numero.toString().padStart(4, '0'),
                premio,
                valor: aposta.valor,
                loteria: loteriaNome || undefined,
                horario: horarioNome || undefined,
                dataConcurso: aposta.dataConcurso || undefined,
              })
            }
          }
        }
      }
    }

    if (apostasFiltradas.length === 0) {
      return {
        success: false,
        message: `Nenhuma aposta encontrada que cubra o prêmio ${premio}º`,
      }
    }

    // Agrupar por loteria/horário/data para criar descargas separadas
    const grupos = new Map<string, ApostaParaDescarga[]>()
    
    for (const aposta of apostasFiltradas) {
      const key = `${aposta.loteria || 'geral'}|${aposta.horario || 'geral'}|${aposta.dataConcurso?.toISOString().split('T')[0] || 'geral'}`
      if (!grupos.has(key)) {
        grupos.set(key, [])
      }
      grupos.get(key)!.push(aposta)
    }

    // Efetuar descarga para cada grupo
    const client = new FrkApiClient(config)
    const resultados: Array<{ success: boolean; message: string; pule?: number }> = []

    for (const [key, apostasGrupo] of grupos.entries()) {
      const [loteria, horario, dataStr] = key.split('|')
      
      // Buscar código da extração (tnyExtracao)
      // Por enquanto, usar um valor padrão ou buscar do banco
      let tnyExtracao = 0
      if (loteria !== 'geral') {
        const extracao = extracoes.find(e => e.name === loteria)
        if (extracao) {
          // Tentar mapear para código FRK (pode precisar de ajuste)
          tnyExtracao = extracao.id
        }
      }

      const dataJogo = dataStr !== 'geral' ? dataStr : new Date().toISOString().split('T')[0]
      const agora = new Date()
      const dataHora = `${dataJogo} ${agora.getHours().toString().padStart(2, '0')}:${agora.getMinutes().toString().padStart(2, '0')}`

      // Converter apostas para formato FRK
      const arrApostas = apostasGrupo.map(aposta => ({
        sntTipoJogo: mapearTipoJogoFRK(aposta.modalidade, ''),
        vchNumero: aposta.numero,
        vchPremio: mapearPremioFRK(aposta.premio),
        numValor: aposta.valor,
        numValorTotal: aposta.valor,
      }))

      const quantidadeApostas = arrApostas.length
      const valorTotal = arrApostas.reduce((sum, ap) => sum + ap.numValor, 0)

      try {
        const resultado = await client.efetuarDescarga({
          sdtDataJogo: dataJogo,
          sdtDataHora: dataHora,
          tnyExtracao,
          sntQuantidadeApostas: quantidadeApostas,
          numValorApostas: valorTotal,
          sdtDataHoraTerminal: dataHora,
          arrApostas,
          arrExtracaoData: [],
        })

        resultados.push({
          success: true,
          message: `Descarga efetuada com sucesso. Pule: ${resultado.intNumeroPule}`,
          pule: resultado.intNumeroPule,
        })

        console.log(`✅ Descarga automática FRK: ${quantidadeApostas} apostas, valor R$ ${valorTotal.toFixed(2)}, pule ${resultado.intNumeroPule}`)
      } catch (error: any) {
        console.error(`❌ Erro ao efetuar descarga automática para grupo ${key}:`, error)
        resultados.push({
          success: false,
          message: `Erro: ${error.message || 'Erro desconhecido'}`,
        })
      }
    }

    // Retornar resultado consolidado
    const sucessos = resultados.filter(r => r.success).length
    const total = resultados.length

    return {
      success: sucessos > 0,
      message: `${sucessos}/${total} descarga(s) efetuada(s) com sucesso`,
      pule: resultados.find(r => r.pule)?.pule,
    }
  } catch (error: any) {
    console.error('❌ Erro ao efetuar descarga automática:', error)
    return {
      success: false,
      message: `Erro: ${error.message || 'Erro desconhecido'}`,
    }
  }
}
