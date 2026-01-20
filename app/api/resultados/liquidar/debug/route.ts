import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buscarResultadosBichoCerto } from '@/lib/bichocerto-parser'
import { extracoes } from '@/data/extracoes'
import { getHorarioRealApuracao, temSorteioNoDia } from '@/data/horarios-reais-apuracao'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/resultados/liquidar/debug
 * 
 * Endpoint de debug para diagnóstico de liquidação
 * Retorna informações detalhadas sobre apostas pendentes e resultados disponíveis
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const loteriaFilter = searchParams.get('loteria')
    const dataFilter = searchParams.get('data')
    
    // Buscar apostas pendentes
    const whereClause: any = {
      status: 'pendente',
    }
    
    if (loteriaFilter) whereClause.loteria = loteriaFilter
    if (dataFilter) whereClause.dataConcurso = new Date(dataFilter)
    
    const apostasPendentes = await prisma.aposta.findMany({
      where: whereClause,
      include: {
        usuario: {
          select: {
            id: true,
            email: true,
            saldo: true,
          },
        },
      },
      take: 50, // Limitar para não sobrecarregar
    })
    
    // Agrupar apostas por loteria/data
    const apostasPorLoteria: Record<string, {
      loteria: string
      data: string
      apostas: any[]
      resultadosDisponiveis: any[]
      podeLiquidar: boolean
      motivo?: string
    }> = {}
    
    for (const aposta of apostasPendentes) {
      let nomeLoteria: string | null = null
      if (aposta.loteria && /^\d+$/.test(aposta.loteria)) {
        const extracaoId = parseInt(aposta.loteria, 10)
        const extracao = extracoes.find((e) => e.id === extracaoId)
        nomeLoteria = extracao?.name || null
      } else {
        nomeLoteria = aposta.loteria
      }
      
      if (!nomeLoteria || !aposta.dataConcurso) continue
      
      const dataISO = aposta.dataConcurso.toISOString().split('T')[0]
      const key = `${nomeLoteria}|${dataISO}`
      
      if (!apostasPorLoteria[key]) {
        apostasPorLoteria[key] = {
          loteria: nomeLoteria,
          data: dataISO,
          apostas: [],
          resultadosDisponiveis: [],
          podeLiquidar: false,
        }
      }
      
      apostasPorLoteria[key].apostas.push({
        id: aposta.id,
        horario: aposta.horario,
        modalidade: aposta.modalidade,
        valor: aposta.valor,
        usuarioId: aposta.usuarioId,
        usuarioEmail: aposta.usuario.email,
      })
    }
    
    // Buscar resultados para cada combinação loteria/data
    for (const key in apostasPorLoteria) {
      const grupo = apostasPorLoteria[key]
      
      try {
        // Verificar se já passou horário de apuração
        const extracao = extracoes.find(e => e.name === grupo.loteria)
        if (extracao) {
          const horarioReal = getHorarioRealApuracao(extracao.name, extracao.time)
          if (horarioReal) {
            const dataConcurso = new Date(grupo.data)
            const diaSemana = dataConcurso.getDay()
            
            if (!temSorteioNoDia(horarioReal, diaSemana)) {
              grupo.podeLiquidar = false
              grupo.motivo = `Não há sorteio neste dia da semana (${['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][diaSemana]})`
              continue
            }
            
            // Verificar se já passou o horário
            const agora = new Date()
            const dataApuracao = new Date(grupo.data)
            const [hora, minuto] = horarioReal.closeTimeReal.split(':').map(Number)
            dataApuracao.setHours(hora, minuto, 0, 0)
            
            if (agora >= dataApuracao) {
              grupo.podeLiquidar = true
            } else {
              grupo.podeLiquidar = false
              grupo.motivo = `Aguardando apuração (horário: ${horarioReal.closeTimeReal})`
            }
          }
        }
        
        // Buscar resultados do bichocerto.com
        const resultadosBichoCerto = await buscarResultadosBichoCerto(grupo.loteria, grupo.data)
        
        grupo.resultadosDisponiveis = resultadosBichoCerto.map(r => ({
          horario: r.horario,
          titulo: r.titulo,
          quantidadePremios: r.premios.length,
          posicoes: r.premios.map(p => p.posicao),
          premios: r.premios.slice(0, 7), // Primeiros 7 para preview
        }))
        
        // Verificar se resultado está completo (tem pelo menos 7 posições)
        const resultadoCompleto = resultadosBichoCerto.some(r => {
          const posicoes = r.premios.map(p => p.posicao)
          const posicoesObrigatorias = ['1º', '2º', '3º', '4º', '5º', '6º', '7º']
          return posicoesObrigatorias.every(pos => posicoes.includes(pos))
        })
        
        if (!resultadoCompleto && grupo.resultadosDisponiveis.length > 0) {
          grupo.motivo = 'Resultado incompleto (faltam posições obrigatórias)'
        } else if (resultadoCompleto && grupo.podeLiquidar) {
          grupo.motivo = 'Pronto para liquidar'
        }
      } catch (error) {
        grupo.motivo = `Erro ao buscar resultados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    }
    
    return NextResponse.json({
      totalApostasPendentes: apostasPendentes.length,
      grupos: Object.values(apostasPorLoteria),
      configuracoes: {
        usarBichoCertoDireto: process.env.USAR_BICHOCERTO_DIRETO !== 'false',
        bichoCertoPhpsessid: process.env.BICHOCERTO_PHPSESSID ? 'Configurado' : 'Não configurado',
      },
    })
  } catch (error) {
    console.error('Erro no endpoint de debug:', error)
    return NextResponse.json(
      {
        error: 'Erro ao executar debug',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}
