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
import { buscarResultadosAgenciaMidas, normalizarChaveHorario } from '@/lib/agenciamidas-api'
import { getCotada } from '@/lib/cotadas-store'
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
 * Verifica se pode tentar liquidar (apenas bloqueia data futura).
 * A liquidação SÓ ocorre quando há resultados correspondentes na API.
 * Sem margem de tempo: se a API não retornar o resultado daquele horário, não liquida.
 */
function podeTentarLiquidar(nomeLoteria: string | null, dataConcurso: Date | null, horario?: string | null): boolean {
  if (!dataConcurso) return true
  const extracao = nomeLoteria && horario ? buscarExtracaoPorNomeEHorario(nomeLoteria, horario) : null
  if (extracao?.name && horario) {
    const horarioReal = getHorarioRealApuracao(extracao.name, horario)
    if (horarioReal && !temSorteioNoDia(horarioReal, dataConcurso.getDay())) {
      return false
    }
  }
  const hoje = new Date()
  const dataConc = new Date(dataConcurso.getFullYear(), dataConcurso.getMonth(), dataConcurso.getDate())
  const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  if (dataConc.getTime() > hojeSemHora.getTime()) {
    return false
  }
  return true
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

    // Limitar quantidade para evitar sobrecarga (processar em lotes)
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
      take: 1000, // Processar no máximo 1000 apostas por vez
      orderBy: { createdAt: 'asc' }, // Processar mais antigas primeiro
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
          resultadoAPI.premios.forEach((premio: { posicao: string; numero: string; grupo: string; animal: string }) => {
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
      'Quina de Grupo': 'QUINA_GRUPO',
      'Duque de Dezena': 'DUQUE_DEZENA',
      'Terno de Dezena': 'TERNO_DEZENA',
      'Passe vai': 'PASSE',
      'Passe vai e vem': 'PASSE_VAI_E_VEM',
    }

    // Criar índice de resultados para acesso rápido (evitar filtros repetidos)
    // Chave: "loteria|horario|data" -> Array de resultados
    const indiceResultados = new Map<string, ResultadoItem[]>()
    
    // Pré-processar resultados em índice para acesso O(1) ao invés de O(n) por aposta
    for (const resultado of resultados) {
      const loteriaNormalizada = normalizarLoteria(resultado.loteria || '') || ''
      const horario = normalizarChaveHorario(resultado.horario || '') || (resultado.horario || '').trim()
      const data = resultado.date || resultado.dataExtracao || ''
      const chave = `${loteriaNormalizada}|${horario}|${data}`
      
      if (!indiceResultados.has(chave)) {
        indiceResultados.set(chave, [])
      }
      indiceResultados.get(chave)!.push(resultado)
    }
    
    console.log(`📊 Índice de resultados criado: ${indiceResultados.size} chaves únicas`)

    // Processar apostas em lotes paralelos para melhor performance
    const BATCH_SIZE = 50 // Processar 50 apostas por vez em paralelo
    let processadas = 0
    let liquidadas = 0
    let premioTotalGeral = 0

    const processarAposta = async (aposta: typeof apostasPendentes[0]): Promise<{ processadas: number; liquidadas: number; premioTotal: number }> => {
      let processadasLocal = 0
      let liquidadasLocal = 0
      let premioTotalLocal = 0

      try {
        // Verificar se já passou o horário de apuração antes de liquidar
        if (aposta.loteria && aposta.dataConcurso) {
          // Normalizar loteria (converter ID para nome se necessário)
          const nomeLoteria = normalizarLoteria(aposta.loteria) || null
          
          const podeLiquidar = podeTentarLiquidar(
            nomeLoteria,
            aposta.dataConcurso,
            aposta.horario && aposta.horario !== 'null' ? aposta.horario : undefined
          )
          
          if (!podeLiquidar) {
            console.log(`⏸️  Pulando aposta ${aposta.id} - data futura ou sem sorteio no dia`)
            return { processadas: processadasLocal, liquidadas: liquidadasLocal, premioTotal: premioTotalLocal }
          }
        }

        // Buscar resultados do índice (muito mais rápido que filtrar)
        let resultadosFiltrados: ResultadoItem[] = []
        
        // Tentar buscar por chave exata primeiro (horário normalizado HH:MM)
        if (aposta.loteria && aposta.horario && aposta.dataConcurso) {
          const loteriaNormalizada = normalizarLoteria(aposta.loteria) || ''
          const horarioAposta = normalizarChaveHorario(aposta.horario) || (aposta.horario || '').trim()
          const dataAposta = aposta.dataConcurso.toISOString().split('T')[0]
          const chaveExata = `${loteriaNormalizada}|${horarioAposta}|${dataAposta}`
          resultadosFiltrados = indiceResultados.get(chaveExata) || []
        }
        
        // Se não encontrou por chave exata, fazer busca flexível
        if (resultadosFiltrados.length === 0) {
          resultadosFiltrados = resultados

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
            const horarioApostaNorm = normalizarChaveHorario(aposta.horario) || aposta.horario
            resultadosFiltrados = resultadosFiltrados.filter((r) => {
              const horarioResultadoNorm = normalizarChaveHorario(r.horario || '') || r.horario
              return horarioResultadoNorm === horarioApostaNorm
            })
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

          // Fallback: quando a API não retorna horario em cada extração, casar pelo índice da
          // extração. Ordenar resultados por horário (mesma ordem de extracoes) antes de fatiar.
          if (resultadosFiltrados.length === 0 && aposta.loteria && aposta.horario && aposta.dataConcurso) {
            const loteriaNorm = normalizarLoteria(aposta.loteria) || ''
            const dataApostaISO = aposta.dataConcurso.toISOString().split('T')[0]
            const horarioAposta = normalizarChaveHorario(aposta.horario) || (aposta.horario || '').trim()

            let todosLoteriaData = resultados.filter((r) => {
              const loteriaOk = loteriaNorm && r.loteria && matchExtracao(normalizarLoteria(r.loteria) || '', loteriaNorm)
              const dataStr = (r.date || r.dataExtracao || '').toString().split('T')[0]
              const dataOk = dataStr === dataApostaISO
              return loteriaOk && dataOk
            })

            // PT SP (Band) e PT SP compartilham API "sp": incluir todas extrações SP para índice correto
            const loteriaUpper = loteriaNorm.toUpperCase()
            const incluirTodasPTSP = loteriaUpper.includes('PT SP') && loteriaUpper.includes('SP')
            const extracoesLoteria = extracoes
              .filter((e) => {
                if (!e.name || e.estado !== 'SP') return false
                if (incluirTodasPTSP) return e.name.toUpperCase().includes('PT SP')
                return normalizarLoteria(e.name) === loteriaNorm || e.name.toUpperCase() === loteriaUpper
              })
              .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
            const premiosPorExtracao = 7
            if (todosLoteriaData.length >= premiosPorExtracao && extracoesLoteria.length > 0) {
              // Ordenar pela mesma ordem das extrações (por horário) para o slice pegar o bloco certo
              const ordemHorarios = extracoesLoteria.map((e) => e.time || '')
              todosLoteriaData = todosLoteriaData.sort((a, b) => {
                const ia = ordemHorarios.indexOf(a.horario || '')
                const ib = ordemHorarios.indexOf(b.horario || '')
                return ia - ib
              })
              const idxHorario = extracoesLoteria.findIndex((e) => e.time === horarioAposta)
              if (idxHorario >= 0) {
                const inicio = idxHorario * premiosPorExtracao
                const fim = inicio + premiosPorExtracao
                if (fim <= todosLoteriaData.length) {
                  resultadosFiltrados = todosLoteriaData.slice(inicio, fim)
                  console.log(
                    `✅ Fallback por índice: aposta ${aposta.id} casada com extração ${horarioAposta} (índice ${idxHorario})`
                  )
                }
              }
            }
          }
        }

        if (resultadosFiltrados.length === 0) {
          console.log(`Nenhum resultado encontrado para aposta ${aposta.id}`)
          return { processadas: processadasLocal, liquidadas: liquidadasLocal, premioTotal: premioTotalLocal }
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
          return { processadas: processadasLocal, liquidadas: liquidadasLocal, premioTotal: premioTotalLocal }
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
          return { processadas: processadasLocal, liquidadas: liquidadasLocal, premioTotal: premioTotalLocal }
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
                                 modalityType.includes('MILHAR') ||
                                 modalityType === 'DUQUE_DEZENA' ||
                                 modalityType === 'TERNO_DEZENA'
        
        const qtdPalpites = isNumberModality 
          ? (betData.numberBets?.length || 0)
          : (betData.animalBets?.length || 0)
        
        if (qtdPalpites === 0) {
          console.log(`Aposta ${aposta.id} não tem palpites válidos`)
          return { processadas: processadasLocal, liquidadas: liquidadasLocal, premioTotal: premioTotalLocal }
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
            return { processadas: processadasLocal, liquidadas: liquidadasLocal, premioTotal: premioTotalLocal }
          }

          for (const numeroApostado of betData.numberBets) {
            const numeroLimpo = numeroApostado.replace(/\D/g, '') // Remove formatação
            
            if (!numeroLimpo) {
              console.log(`Número apostado inválido: ${numeroApostado}`)
              continue // Continuar para próximo número no loop
            }

            let palpiteData: { grupos?: number[]; numero?: string } = {}
            
            // Para Duque e Terno de Dezena, precisa passar múltiplos números
            if (modalityType === 'DUQUE_DEZENA' || modalityType === 'TERNO_DEZENA') {
              // Assumimos que o número vem como string separada por vírgula ou espaço
              // Ex: "34,56" ou "34 56" para Duque, "34,56,78" para Terno
              const numeros = numeroLimpo.includes(',') 
                ? numeroLimpo.split(',').map(n => n.trim())
                : numeroLimpo.match(/.{1,2}/g) || [numeroLimpo]
              palpiteData = { numero: numeros.join(',') }
            } else {
              palpiteData = { numero: numeroLimpo }
            }

            // Verificar se o número é cotado e buscar cotação personalizada (apenas Milhar e Centena)
            let cotacaoPersonalizada: number | undefined = undefined
            if (modalityType === 'MILHAR' || modalityType === 'CENTENA') {
              try {
                const cotada = await getCotada(numeroLimpo, modalityType)
                if (cotada) {
                  cotacaoPersonalizada = cotada.cotacao
                  console.log(`📋 Número ${numeroLimpo} é cotado com cotação ${cotacaoPersonalizada}x`)
                }
              } catch (error) {
                console.error(`Erro ao verificar cotada para ${numeroLimpo}:`, error)
              }
            }

            const conferencia = conferirPalpite(
              resultadoOficial,
              modalityType,
              palpiteData,
              pos_from,
              pos_to,
              valorPorPalpite,
              betData.divisionType,
              cotacaoPersonalizada
            )

            premioTotalAposta += conferencia.totalPrize
          }
        } else {
          // Modalidades de grupo
          if (!betData.animalBets || betData.animalBets.length === 0) {
            console.log(`Aposta ${aposta.id} é modalidade de grupo mas não tem animalBets`)
            return { processadas: processadasLocal, liquidadas: liquidadasLocal, premioTotal: premioTotalLocal }
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
              retornoPrevisto: 0,
              detalhes: {
                ...detalhes,
                resultadoOficial: resultadoOficial,
                premioTotal: 0,
                liquidadoEm: new Date().toISOString(),
              },
            },
          })
        }

        processadasLocal++
        if (premioTotalAposta > 0) {
          liquidadasLocal++
          premioTotalLocal += premioTotalAposta
        }
      } catch (error) {
        console.error(`Erro ao processar aposta ${aposta.id}:`, error)
        // Continua processando outras apostas
      }

      return {
        processadas: processadasLocal,
        liquidadas: liquidadasLocal,
        premioTotal: premioTotalLocal,
      }
    }

    // Processar em lotes paralelos para melhor performance
    for (let i = 0; i < apostasPendentes.length; i += BATCH_SIZE) {
      const batch = apostasPendentes.slice(i, i + BATCH_SIZE)
      const resultados = await Promise.all(batch.map(aposta => processarAposta(aposta)))
      
      // Agregar resultados
      resultados.forEach(result => {
        processadas += result.processadas
        liquidadas += result.liquidadas
        premioTotalGeral += result.premioTotal
      })
      
      console.log(`✅ Processado lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(apostasPendentes.length / BATCH_SIZE)}`)
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
