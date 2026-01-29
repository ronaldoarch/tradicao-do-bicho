import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  conferirPalpite,
  calcularValorPorPalpite,
  type ModalityType,
  type InstantResult,
} from '@/lib/bet-rules-engine'
import { ANIMALS } from '@/data/animals'
import { ResultadoItem } from '@/types/resultados'
import { extracoes } from '@/data/extracoes'
import { buscarExtracaoPorNomeEHorario } from '@/lib/extracao-helpers'
import { getHorarioRealApuracao, temSorteioNoDia } from '@/data/horarios-reais-apuracao'
import { buscarResultadosAgenciaMidas } from '@/lib/agenciamidas-api'
import { normalizarLoteria } from '@/lib/descarga-helpers'

// Configurar timeout maior para operações longas
export const maxDuration = 60 // 60 segundos
export const dynamic = 'force-dynamic'

/**
 * Mapeamento flexível de nomes de extrações para encontrar resultados
 * Mapeia nomes cadastrados para variações possíveis retornadas pela API externa
 */
const EXTRACAO_NAME_MAP: Record<string, string[]> = {
  'PT RIO': ['pt rio', 'pt rio de janeiro', 'pt-rio', 'pt-rio de janeiro', 'mpt-rio', 'mpt rio'],
  'PT BAHIA': ['pt bahia', 'pt-ba', 'maluca bahia'],
  'PT SP': ['pt sp', 'pt-sp', 'pt sp bandeirantes', 'pt-sp/bandeirantes', 'bandeirantes', 'pt sp (band)'],
  'LOOK': ['look', 'look goiás', 'look goias'],
  'LOTEP': ['lotep', 'pt paraiba/lotep', 'pt paraiba', 'pt paraíba', 'pt-pb'],
  'LOTECE': ['lotece', 'pt ceara', 'pt ceará'],
  'PARA TODOS': ['para todos', 'pt nacional'],
  'NACIONAL': ['nacional', 'loteria nacional', 'loteria federal', 'federal'],
  'FEDERAL': ['federal', 'loteria federal'],
}

/**
 * Verifica se já passou o horário de apuração usando horários reais
 * 
 * IMPORTANTE: Esta função usa os horários REAIS de apuração,
 * não os horários internos do sistema.
 * 
 * @param nomeLoteria Nome da loteria da aposta
 * @param dataConcurso Data do concurso da aposta
 * @param horario Horário da aposta (opcional)
 * @returns true se já passou o horário de apuração, false caso contrário
 */
function jaPassouHorarioApuracao(nomeLoteria: string | null, dataConcurso: Date | null, horario?: string | null): boolean {
  // Validação básica
  if (!nomeLoteria || !dataConcurso) {
    console.log('⚠️ Verificação de horário: sem extração ou data, permitindo liquidação')
    return true // Permite liquidar se não tem dados suficientes
  }
  
  // Buscar extração pelo nome e horário
  const extracao = buscarExtracaoPorNomeEHorario(nomeLoteria, horario || undefined)
  
  if (!extracao) {
    console.log('⚠️ Verificação de horário: extração não encontrada, permitindo liquidação')
    return true
  }
  
  // Buscar horário REAL de apuração
  const horarioExtracao = horario || extracao.time || extracao.closeTime || ''
  
  let horarioReal = null
  let startTimeParaUsar = extracao.closeTime || extracao.time || ''
  let closeTimeParaUsar = extracao.closeTime || extracao.time || ''
  
  if (extracao.name && horarioExtracao) {
    try {
      horarioReal = getHorarioRealApuracao(extracao.name, horarioExtracao)
      
      if (horarioReal) {
        // IMPORTANTE: Usar startTimeReal para permitir tentar liquidar a partir do horário inicial
        // O resultado pode começar a sair a partir de startTimeReal
        startTimeParaUsar = horarioReal.startTimeReal || horarioReal.closeTimeReal
        closeTimeParaUsar = horarioReal.closeTimeReal
        
        console.log(`📅 Usando horário REAL de apuração: ${horarioReal.name} ${horarioReal.time}`)
        console.log(`   Início: ${startTimeParaUsar} | Fim: ${closeTimeParaUsar}`)
        
        // Verificar se o dia da semana tem sorteio
        const diaSemana = dataConcurso.getDay() // 0=Domingo, 1=Segunda, ..., 6=Sábado
        if (!temSorteioNoDia(horarioReal, diaSemana)) {
          const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
          console.log(`🚫 ${diasSemana[diaSemana]} não tem sorteio para ${horarioReal.name} ${horarioReal.time}`)
          return false // Não pode liquidar se não tem sorteio neste dia
        }
      } else {
        console.log(`⚠️ Horário real não encontrado para ${extracao.name} ${horarioExtracao}, usando horário interno`)
      }
    } catch (error) {
      console.log(`⚠️ Erro ao buscar horário real: ${error}, usando horário interno`)
    }
  }
  
  if (!startTimeParaUsar) {
    console.log('⚠️ Verificação de horário: sem startTime disponível, permitindo liquidação')
    return true
  }
  
  // Parsear horário inicial de apuração (formato HH:MM)
  const [horas, minutos] = startTimeParaUsar.split(':').map(Number)
  
  if (isNaN(horas) || isNaN(minutos)) {
    console.log(`⚠️ Verificação de horário: startTime inválido "${startTimeParaUsar}", permitindo liquidação`)
    return true
  }
  
  // IMPORTANTE: Usar horário de Brasília (GMT-3) para comparação
  // Obter horário atual em Brasília
  const agoraUTC = new Date()
  const agoraBrasiliaStr = agoraUTC.toLocaleString('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  
  // Converter string "MM/DD/YYYY, HH:MM:SS" para Date
  const [dataPart, horaPart] = agoraBrasiliaStr.split(', ')
  const [mes, dia, ano] = dataPart.split('/')
  const [horaAtual, minutoAtual, segundoAtual] = horaPart.split(':')
  const agora = new Date(
    parseInt(ano),
    parseInt(mes) - 1,
    parseInt(dia),
    parseInt(horaAtual),
    parseInt(minutoAtual),
    parseInt(segundoAtual)
  )
  
  // Obter data do concurso em horário de Brasília
  const dataConcursoBrasiliaStr = dataConcurso.toLocaleString('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  const [mesConc, diaConc, anoConc] = dataConcursoBrasiliaStr.split('/')
  
  // Criar data/hora INICIAL de apuração no dia do concurso usando horário de Brasília
  const dataApuracaoInicial = new Date(
    parseInt(anoConc),
    parseInt(mesConc) - 1,
    parseInt(diaConc),
    horas,
    minutos,
    0
  )
  
  // Criar datas para comparação de dia (sem hora) em horário de Brasília
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
  const dataConcursoSemHora = new Date(
    parseInt(anoConc),
    parseInt(mesConc) - 1,
    parseInt(diaConc)
  )
  
  // Se for hoje, usar hora atual; se for passado, já pode liquidar; se for futuro, não pode
  if (dataConcursoSemHora.getTime() === hoje.getTime()) {
    // Mesmo dia: verificar se já passou o horário INICIAL
    const jaPassouHorarioInicial = agora >= dataApuracaoInicial
    
    const horaApuracaoInicial = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`
    const horaAtualStr = `${agora.getHours().toString().padStart(2, '0')}:${agora.getMinutes().toString().padStart(2, '0')}:${agora.getSeconds().toString().padStart(2, '0')}`
    
    const fonteHorario = horarioReal ? '(horário real)' : '(interno)'
    console.log(`⏰ Verificação de horário: ${extracao.name} (ID ${extracao.id})`)
    console.log(`   startTime: ${startTimeParaUsar} | closeTime: ${closeTimeParaUsar} ${fonteHorario}`)
    console.log(`   Data apuração inicial: ${dataConcursoSemHora.toLocaleDateString('pt-BR')} ${horaApuracaoInicial}`)
    console.log(`   Agora: ${agora.toLocaleDateString('pt-BR')} ${horaAtualStr}`)
    console.log(`   ${jaPassouHorarioInicial ? '✅ Já pode tentar liquidar' : '⏸️  Ainda não passou o horário inicial'}`)
    
    return jaPassouHorarioInicial
  } else if (dataConcursoSemHora.getTime() < hoje.getTime()) {
    // Dia passado: já pode liquidar
    console.log('✅ Verificação de horário: data do concurso é passado, permitindo liquidação')
    return true
  } else {
    // Dia futuro: não pode liquidar ainda
    console.log('⏸️  Verificação de horário: data do concurso é futuro, bloqueando liquidação')
    return false
  }
}

/**
 * Função auxiliar para inferir UF do nome
 */
function inferUfFromName(name?: string | null): string | undefined {
  if (!name) return undefined
  const key = name.toLowerCase().trim()
  const UF_MAP: Record<string, string> = {
    'pt rio': 'RJ',
    'pt rio de janeiro': 'RJ',
    'pt-rio': 'RJ',
    'pt sp': 'SP',
    'pt-sp': 'SP',
    'pt bahia': 'BA',
    'pt-ba': 'BA',
    'lotep': 'PB',
    'look': 'GO',
    'lotece': 'CE',
    'nacional': 'BR',
    'para todos': 'BR',
    'federal': 'BR',
  }
  return UF_MAP[key]
}

/**
 * Busca nomes possíveis para match flexível de extrações
 */
function getNomesPossiveis(nomeExtracao: string): string[] {
  const nomeUpper = nomeExtracao.toUpperCase()
  const nomesMapeados = EXTRACAO_NAME_MAP[nomeUpper] || []
  return [nomeExtracao.toLowerCase(), nomeUpper, ...nomesMapeados]
}

/**
 * Verifica se um resultado corresponde a uma extração usando match flexível
 */
function matchExtracao(resultadoLoteria: string, nomeExtracao: string): boolean {
  const nomesPossiveis = getNomesPossiveis(nomeExtracao)
  const resultadoLower = (resultadoLoteria || '').toLowerCase()
  
  // Match exato ou por substring
  for (const nome of nomesPossiveis) {
    if (resultadoLower === nome.toLowerCase() || resultadoLower.includes(nome.toLowerCase())) {
      return true
    }
  }
  
  // Match por palavras-chave principais
  const palavrasChave = nomeExtracao.toLowerCase().split(/\s+/).filter((p) => p.length > 2)
  for (const palavra of palavrasChave) {
    if (resultadoLower.includes(palavra)) {
      return true
    }
  }
  
  return false
}

/**
 * GET /api/resultados/liquidar
 * 
 * Retorna estatísticas de apostas pendentes
 */
export async function GET() {
  try {
    const apostasPendentes = await prisma.aposta.count({
      where: { status: 'pendente' },
    })

    const apostasLiquidadas = await prisma.aposta.count({
      where: { status: 'liquidado' },
    })

    const apostasPerdidas = await prisma.aposta.count({
      where: { status: 'perdida' },
    })

    return NextResponse.json({
      pendentes: apostasPendentes,
      liquidadas: apostasLiquidadas,
      perdidas: apostasPerdidas,
      total: apostasPendentes + apostasLiquidadas + apostasPerdidas,
    })
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
    return NextResponse.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 })
  }
}

/**
 * Endpoint para liquidação automática de apostas pendentes
 * 
 * POST /api/resultados/liquidar
 * 
 * Body (opcional):
 * - loteria: filtrar por loteria específica
 * - dataConcurso: filtrar por data específica
 * - horario: filtrar por horário específico
 * 
 * Se não enviar parâmetros, processa todas as apostas pendentes
 * 
 * Estratégia:
 * - Busca resultados APENAS da API Agência Midas
 * - Não usa fallbacks (API interna ou externa)
 * - Se não encontrar resultados, retorna erro claro
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { loteria, dataConcurso, horario } = body

    // Sistema usa APENAS API Agência Midas (sem fallbacks)

    // Buscar apostas pendentes
    const whereClause: any = {
      status: 'pendente',
    }

    if (loteria) whereClause.loteria = loteria
    if (dataConcurso) whereClause.dataConcurso = new Date(dataConcurso)
    if (horario) whereClause.horario = horario

    const apostasPendentes = await prisma.aposta.findMany({
      where: whereClause,
      include: {
        usuario: {
          select: {
            id: true,
            saldo: true,
            bonus: true,
          },
        },
      },
    })

    if (apostasPendentes.length === 0) {
      return NextResponse.json({
        message: 'Nenhuma aposta pendente encontrada',
        processadas: 0,
        liquidadas: 0,
        premioTotal: 0,
      })
    }

    // Buscar resultados oficiais APENAS da API Agência Midas (sem fallback)
    let resultados: ResultadoItem[] = []
    
    try {
      // Coletar loterias únicas das apostas pendentes (normalizadas)
      const loteriasUnicas = new Set<string>()
      apostasPendentes.forEach(aposta => {
        if (aposta.loteria) {
          const loteriaNormalizada = normalizarLoteria(aposta.loteria)
          if (loteriaNormalizada) {
            loteriasUnicas.add(loteriaNormalizada)
          }
        }
      })
      
      // Coletar datas únicas
      const datasUnicas = new Set<string>()
      apostasPendentes.forEach(aposta => {
        if (aposta.dataConcurso) {
          const dataISO = aposta.dataConcurso.toISOString().split('T')[0]
          datasUnicas.add(dataISO)
        }
      })
      
      // Buscar resultados para cada combinação loteria/data EM PARALELO
      const loteriasArray = Array.from(loteriasUnicas)
      const datasArray = Array.from(datasUnicas)
      
      if (loteriasArray.length === 0 || datasArray.length === 0) {
        console.log('⚠️ Nenhuma loteria ou data encontrada nas apostas pendentes')
        return NextResponse.json({
          message: 'Nenhuma loteria ou data encontrada nas apostas pendentes',
          processadas: 0,
          liquidadas: 0,
          premioTotal: 0,
        })
      }
      
      // Criar array de promessas para executar em paralelo
      const promessasBusca: Promise<{ loteria: string; dataISO: string; resultados: any[] }>[] = []
      
      for (const loteria of loteriasArray) {
        for (const dataISO of datasArray) {
          promessasBusca.push(
            buscarResultadosAgenciaMidas(loteria, dataISO)
              .then(resultadosAPI => ({
                loteria,
                dataISO,
                resultados: resultadosAPI,
              }))
              .catch(error => {
                console.error(`❌ Erro ao buscar ${loteria} ${dataISO}:`, error)
                return { loteria, dataISO, resultados: [] }
              })
          )
        }
      }
      
      // Executar todas as buscas em paralelo
      console.log(`🚀 Buscando ${promessasBusca.length} combinações de loteria/data em paralelo...`)
      const resultadosBuscados = await Promise.all(promessasBusca)
      
      // Processar resultados obtidos
      for (const { loteria, dataISO, resultados: resultadosAPI } of resultadosBuscados) {
        // Converter formato da API para formato ResultadoItem
        resultadosAPI.forEach(resultadoAPI => {
          resultadoAPI.premios.forEach(premio => {
            resultados.push({
              position: premio.posicao,
              milhar: premio.numero,
              grupo: premio.grupo,
              animal: premio.animal,
              drawTime: resultadoAPI.horario,
              horario: resultadoAPI.horario,
              loteria: loteria,
              location: inferUfFromName(loteria) || '',
              date: dataISO,
              dataExtracao: dataISO,
              estado: inferUfFromName(loteria) || undefined,
            })
          })
        })
      }
      
      console.log(`✅ Resultados obtidos da API Agência Midas: ${resultados.length} resultados`)
    } catch (error: any) {
      console.error('❌ Erro ao buscar resultados da API Agência Midas:', error)
      return NextResponse.json(
        {
          error: 'Erro ao buscar resultados da API Agência Midas',
          detalhes: error.message || String(error),
          message: 'Não foi possível buscar resultados oficiais. Tente novamente mais tarde.',
        },
        { status: 500 }
      )
    }

    if (resultados.length === 0) {
      return NextResponse.json({
        message: 'Nenhum resultado oficial encontrado na API Agência Midas para as apostas pendentes',
        processadas: 0,
        liquidadas: 0,
        premioTotal: 0,
        detalhes: 'Verifique se as loterias e datas das apostas estão corretas',
      })
    }

    // Mapear nome da modalidade para tipo
    const modalityMap: Record<string, ModalityType> = {
      Grupo: 'GRUPO',
      'Dupla de Grupo': 'DUPLA_GRUPO',
      'Terno de Grupo': 'TERNO_GRUPO',
      'Quadra de Grupo': 'QUADRA_GRUPO',
      Dezena: 'DEZENA',
      Centena: 'CENTENA',
      Milhar: 'MILHAR',
      'Dezena Invertida': 'DEZENA_INVERTIDA',
      'Centena Invertida': 'CENTENA_INVERTIDA',
      'Milhar Invertida': 'MILHAR_INVERTIDA',
      'Milhar/Centena': 'MILHAR_CENTENA',
      'Passe vai': 'PASSE',
      'Passe vai e vem': 'PASSE_VAI_E_VEM',
    }

    let processadas = 0
    let liquidadas = 0
    let premioTotalGeral = 0

    // Processar cada aposta
    for (const aposta of apostasPendentes) {
      try {
        // Verificar se já passou o horário de apuração antes de liquidar
        if (aposta.loteria && aposta.dataConcurso) {
          // Normalizar loteria (converter ID para nome se necessário)
          const nomeLoteria = normalizarLoteria(aposta.loteria) || null
          
          const podeLiquidar = jaPassouHorarioApuracao(
            nomeLoteria,
            aposta.dataConcurso,
            aposta.horario && aposta.horario !== 'null' ? aposta.horario : undefined
          )
          
          if (!podeLiquidar) {
            console.log(`⏸️  Pulando aposta ${aposta.id} - aguardando apuração`)
            continue
          }
        }

        // Filtrar resultados por loteria/horário/data da aposta
        let resultadosFiltrados = resultados

        if (aposta.loteria) {
          // Normalizar loteria antes de fazer match
          const loteriaApostaNormalizada = normalizarLoteria(aposta.loteria)
          const antesFiltro = resultadosFiltrados.length
          
          resultadosFiltrados = resultadosFiltrados.filter((r) => {
            if (!r.loteria) return false
            // Normalizar loteria do resultado também para comparação
            const loteriaResultadoNormalizada = normalizarLoteria(r.loteria)
            return matchExtracao(loteriaResultadoNormalizada, loteriaApostaNormalizada)
          })
          
          if (resultadosFiltrados.length === 0 && antesFiltro > 0) {
            console.log(
              `⚠️ Nenhum resultado encontrado para "${loteriaApostaNormalizada}" após filtro flexível (antes: ${antesFiltro})`
            )
            console.log(`   Nomes possíveis: ${getNomesPossiveis(loteriaApostaNormalizada).join(', ')}`)
          } else if (resultadosFiltrados.length > 0) {
            console.log(
              `✅ Após filtro de loteria "${loteriaApostaNormalizada}": ${resultadosFiltrados.length} resultados (antes: ${antesFiltro})`
            )
          }
        }

        if (aposta.horario) {
          const horarioAposta = aposta.horario // Garantir que não é null
          resultadosFiltrados = resultadosFiltrados.filter((r) => r.horario === horarioAposta)
        }

        if (aposta.dataConcurso) {
          // Normalizar data da aposta (formato ISO: 2026-01-14)
          const dataAposta = aposta.dataConcurso.toISOString().split('T')[0]
          const [anoAposta, mesAposta, diaAposta] = dataAposta.split('-')
          const dataApostaFormatada = `${diaAposta}/${mesAposta}/${anoAposta}` // Formato brasileiro: 14/01/2026
          
          resultadosFiltrados = resultadosFiltrados.filter((r) => {
            if (!r.date && !r.dataExtracao) return false
            const dataResultado = r.date || r.dataExtracao || ''
            
            // Comparar formato ISO (2026-01-14)
            if (dataResultado.split('T')[0] === dataAposta) return true
            
            // Comparar formato brasileiro (14/01/2026)
            if (dataResultado === dataApostaFormatada) return true
            
            // Comparação parcial (dia/mês/ano)
            const matchBR = dataResultado.match(/(\d{2})\/(\d{2})\/(\d{4})/)
            if (matchBR) {
              const [_, dia, mes, ano] = matchBR
              if (`${ano}-${mes}-${dia}` === dataAposta) return true
            }
            
            return false
          })
        }

        if (resultadosFiltrados.length === 0) {
          console.log(`Nenhum resultado encontrado para aposta ${aposta.id}`)
          continue
        }

        // Converter resultados para formato do motor de regras
        // Ordenar por posição (1º, 2º, 3º, etc.)
        const resultadosOrdenados = resultadosFiltrados
          .filter((r) => r.position && r.milhar)
          .sort((a, b) => {
            // Extrair número da posição (1º, 2º, etc.)
            const getPosNumber = (pos?: string): number => {
              if (!pos) return 999
              const match = pos.match(/(\d+)/)
              return match ? parseInt(match[1], 10) : 999
            }
            return getPosNumber(a.position) - getPosNumber(b.position)
          })
          .slice(0, 7) // Limitar a 7 prêmios

        if (resultadosOrdenados.length === 0) {
          console.log(`Nenhum resultado válido encontrado para aposta ${aposta.id}`)
          continue
        }

        // Converter para lista de milhares (formato esperado pelo motor)
        const milhares = resultadosOrdenados.map((r) => {
          const milharStr = (r.milhar || '0000').replace(/\D/g, '') // Remove não-dígitos
          return parseInt(milharStr.padStart(4, '0').slice(-4)) // Garante 4 dígitos
        })

        const grupos = milhares.map((m) => {
          const dezena = m % 100
          if (dezena === 0) return 25
          return Math.floor((dezena - 1) / 4) + 1
        })

        const resultadoOficial: InstantResult = {
          prizes: milhares,
          groups: grupos,
        }

        // Extrair dados da aposta
        const detalhes = aposta.detalhes as any
        if (!detalhes || !detalhes.betData) {
          console.log(`Aposta ${aposta.id} não tem betData`)
          continue
        }

        const betData = detalhes.betData as {
          modality: string | null
          modalityName?: string | null
          animalBets?: number[][]
          numberBets?: string[]
          position?: string | null
          customPosition?: boolean
          customPositionValue?: string
          amount: number
          divisionType: 'all' | 'each'
        }

        const modalityType = modalityMap[betData.modalityName || aposta.modalidade || ''] || 'GRUPO'

        // Parsear posição
        const positionToUse = betData.customPosition && betData.customPositionValue 
          ? betData.customPositionValue.trim() 
          : betData.position
        
        let pos_from = 1
        let pos_to = 1
        if (positionToUse) {
          if (positionToUse === '1st' || positionToUse === '1') {
            pos_from = 1
            pos_to = 1
          } else if (positionToUse.includes('-')) {
            const [from, to] = positionToUse.split('-').map(Number)
            pos_from = from || 1
            pos_to = to || 1
          } else {
            const singlePos = parseInt(positionToUse.replace(/º/g, '').replace(/\s/g, ''), 10)
            if (!isNaN(singlePos) && singlePos >= 1 && singlePos <= 7) {
              pos_from = singlePos
              pos_to = singlePos
            }
          }
        }

        // Calcular valor por palpite
        const isNumberModality = modalityType.includes('DEZENA') || 
                                 modalityType.includes('CENTENA') || 
                                 modalityType.includes('MILHAR')
        
        const qtdPalpites = isNumberModality 
          ? (betData.numberBets?.length || 0)
          : (betData.animalBets?.length || 0)
        
        if (qtdPalpites === 0) {
          console.log(`Aposta ${aposta.id} não tem palpites válidos`)
          continue
        }
        
        const valorPorPalpite = calcularValorPorPalpite(
          betData.amount,
          qtdPalpites,
          betData.divisionType
        )

        // Conferir cada palpite
        let premioTotalAposta = 0

        if (isNumberModality) {
          // Modalidades numéricas (Milhar, Centena, Dezena)
          if (!betData.numberBets || betData.numberBets.length === 0) {
            console.log(`Aposta ${aposta.id} é modalidade numérica mas não tem numberBets`)
            continue
          }

          for (const numeroApostado of betData.numberBets) {
            const numeroLimpo = numeroApostado.replace(/\D/g, '') // Remove formatação
            
            if (!numeroLimpo) {
              console.log(`Número apostado inválido: ${numeroApostado}`)
              continue
            }

            const palpiteData: { grupos?: number[]; numero?: string } = { numero: numeroLimpo }

            const conferencia = conferirPalpite(
              resultadoOficial,
              modalityType,
              palpiteData,
              pos_from,
              pos_to,
              valorPorPalpite,
              betData.divisionType
            )

            premioTotalAposta += conferencia.totalPrize
          }
        } else {
          // Modalidades de grupo
          if (!betData.animalBets || betData.animalBets.length === 0) {
            console.log(`Aposta ${aposta.id} é modalidade de grupo mas não tem animalBets`)
            continue
          }

          for (const animalBet of betData.animalBets) {
            const gruposApostados = animalBet.map((animalId) => {
              const animal = ANIMALS.find((a) => a.id === animalId)
              if (!animal) {
                throw new Error(`Animal não encontrado: ${animalId}`)
              }
              return animal.group
            })

            const palpiteData: { grupos?: number[]; numero?: string } = { grupos: gruposApostados }

            const conferencia = conferirPalpite(
              resultadoOficial,
              modalityType,
              palpiteData,
              pos_from,
              pos_to,
              valorPorPalpite,
              betData.divisionType
            )

            premioTotalAposta += conferencia.totalPrize
          }
        }

        // Atualizar aposta e saldo do usuário
        if (premioTotalAposta > 0) {
          await prisma.$transaction(async (tx) => {
            // Atualizar aposta
            await tx.aposta.update({
              where: { id: aposta.id },
              data: {
                status: 'liquidado',
                retornoPrevisto: premioTotalAposta,
                detalhes: {
                  ...detalhes,
                  resultadoOficial: resultadoOficial,
                  premioTotal: premioTotalAposta,
                  liquidadoEm: new Date().toISOString(),
                },
              },
            })

            // Creditar prêmio no saldo do usuário
            // IMPORTANTE: Prêmios vão para saldo E saldoSacavel (podem ser sacados)
            await tx.usuario.update({
              where: { id: aposta.usuarioId },
              data: {
                saldo: {
                  increment: premioTotalAposta,
                },
                saldoSacavel: {
                  increment: premioTotalAposta,
                },
              },
            })
          })

          liquidadas++
          premioTotalGeral += premioTotalAposta
        } else {
          // Marcar como não ganhou
          await prisma.aposta.update({
            where: { id: aposta.id },
            data: {
              status: 'perdida',
              detalhes: {
                ...detalhes,
                resultadoOficial: resultadoOficial,
                premioTotal: 0,
                liquidadoEm: new Date().toISOString(),
              },
            },
          })
        }

        processadas++
      } catch (error) {
        console.error(`Erro ao processar aposta ${aposta.id}:`, error)
        // Continua processando outras apostas
      }
    }

    return NextResponse.json({
      message: 'Liquidação concluída',
      processadas,
      liquidadas,
      premioTotal: premioTotalGeral,
      fonte: 'agenciamidas.com',
    })
  } catch (error) {
    console.error('Erro ao liquidar apostas:', error)
    return NextResponse.json(
      {
        error: 'Erro ao liquidar apostas',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}
