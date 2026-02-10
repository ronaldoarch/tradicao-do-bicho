import { NextRequest, NextResponse } from 'next/server'
import { ResultadosResponse, ResultadoItem } from '@/types/resultados'
import { toIsoDate } from '@/lib/resultados-helpers'
import { buscarResultadosAgenciaMidas } from '@/lib/agenciamidas-api'

const UF_NAME_MAP: Record<string, string> = {
  RJ: 'Rio de Janeiro',
  SP: 'São Paulo',
  BA: 'Bahia',
  PB: 'Paraíba',
  GO: 'Goiás',
  DF: 'Distrito Federal',
  CE: 'Ceará',
  MG: 'Minas Gerais',
  PR: 'Paraná',
  SC: 'Santa Catarina',
  RS: 'Rio Grande do Sul',
  BR: 'Nacional',
}

const LOTERIA_UF_MAP: Record<string, string> = {
  'pt rio de janeiro': 'RJ',
  'pt-rio de janeiro': 'RJ',
  'pt rio': 'RJ',
  'pt-rio': 'RJ',
  'mpt-rio': 'RJ',
  'mpt rio': 'RJ',
  'pt-sp/bandeirantes': 'SP',
  'pt sp': 'SP',
  'pt-sp': 'SP',
  'pt sp bandeirantes': 'SP',
  bandeirantes: 'SP',
  'pt bahia': 'BA',
  'pt-ba': 'BA',
  'maluca bahia': 'BA',
  'pt paraiba/lotep': 'PB',
  'pt paraiba': 'PB',
  'pt paraíba': 'PB',
  'pt-pb': 'PB',
  lotep: 'PB',
  'pt goias': 'GO',
  'pt goiás': 'GO',
  'look goias': 'GO',
  'look goiás': 'GO',
  look: 'GO',
  'pt ceara': 'CE',
  'pt ceará': 'CE',
  lotece: 'CE',
  'pt minas gerais': 'MG',
  'pt minas': 'MG',
  'pt parana': 'PR',
  'pt paraná': 'PR',
  'pt santa catarina': 'SC',
  'pt rio grande do sul': 'RS',
  'pt rs': 'RS',
  'loteria nacional': 'BR',
  nacional: 'BR',
  'loteria federal': 'BR',
  federal: 'BR',
  'para todos': 'BR',
}

const EXTRACAO_UF_MAP: Record<string, string> = {
  lotece: 'CE',
  lotep: 'PB',
  look: 'GO',
  'para todos': 'BR',
  'pt rio': 'RJ',
  nacional: 'BR',
  'pt bahia': 'BA',
  federal: 'BR',
  'pt sp': 'SP',
  'pt sp (band)': 'SP',
}

const UF_ALIASES: Record<string, string> = {
  rj: 'RJ',
  'rio de janeiro': 'RJ',
  'pt rio': 'RJ',
  'pt-rio': 'RJ',
  'pt rio de janeiro': 'RJ',
  sp: 'SP',
  'sao paulo': 'SP',
  'são paulo': 'SP',
  'pt sp': 'SP',
  'pt-sp': 'SP',
  bandeirantes: 'SP',
  ba: 'BA',
  bahia: 'BA',
  'pt bahia': 'BA',
  'pt-ba': 'BA',
  go: 'GO',
  goias: 'GO',
  'goiás': 'GO',
  look: 'GO',
  'look goias': 'GO',
  'look goiás': 'GO',
  pb: 'PB',
  paraiba: 'PB',
  'paraíba': 'PB',
  lotep: 'PB',
  'pt paraiba': 'PB',
  ce: 'CE',
  ceara: 'CE',
  'ceará': 'CE',
  lotece: 'CE',
  mg: 'MG',
  minas: 'MG',
  'belo horizonte': 'MG',
  pr: 'PR',
  parana: 'PR',
  'paraná': 'PR',
  sc: 'SC',
  'santa catarina': 'SC',
  rs: 'RS',
  'rio grande do sul': 'RS',
  df: 'DF',
  brasilia: 'DF',
  'brasília': 'DF',
  'distrito federal': 'DF',
  federal: 'BR',
  nacional: 'BR',
  'loteria federal': 'BR',
  'para todos': 'BR',
}

function normalizeText(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function resolveUF(location?: string | null) {
  if (!location) return undefined
  const key = normalizeText(location)
  return UF_ALIASES[key] ?? (key.length === 2 ? key.toUpperCase() : undefined)
}

// Função removida - não usa mais API externa

function inferUfFromName(name?: string | null) {
  if (!name) return undefined
  const key = normalizeText(name)
  return (
    UF_ALIASES[key] ||
    LOTERIA_UF_MAP[key] ||
    EXTRACAO_UF_MAP[key] ||
    (key.length === 2 ? key.toUpperCase() : undefined)
  )
}

function normalizeResults(raw: any[]): ResultadoItem[] {
  return raw.map((r: any, idx: number) => {
    const estado =
      r.estado || inferUfFromName(r.estado) || inferUfFromName(r.loteria) || inferUfFromName(r.local) || undefined
    const locationResolved = UF_NAME_MAP[estado || ''] || r.local || r.estado || r.cidade || r.uf || ''
    const dateValue = r.data || r.date || r.dia || r.data_extração || r.dataExtracao || ''

    return {
      position: r.position || r.premio || r.colocacao || `${idx + 1}°`,
      milhar: r.milhar || r.numero || r.milharNumero || r.valor || '',
      grupo: r.grupo || r.grupoNumero || '',
      animal: r.animal || r.nomeAnimal || '',
      drawTime: r.horario || r.drawTime || r.concurso || '',
      horario: r.horario || undefined,
      loteria: r.loteria || r.nomeLoteria || r.concurso || r.horario || '',
      location: locationResolved,
      date: dateValue,
      dataExtracao: dateValue,
      estado,
      posicao: r.posicao || (r.colocacao && parseInt(String(r.colocacao).replace(/\D/g, ''), 10)) || undefined,
      colocacao: r.colocacao || r.position || r.premio || `${idx + 1}°`,
      timestamp: r.timestamp || r.createdAt || r.updatedAt || undefined,
      fonte: r.fonte || r.origem || undefined,
      urlOrigem: r.url_origem || r.urlOrigem || r.link || undefined,
    }
  })
}

function orderByPosition(items: ResultadoItem[]) {
  const getOrder = (value?: string, pos?: number) => {
    if (typeof pos === 'number' && !Number.isNaN(pos)) return pos
    if (!value) return Number.MAX_SAFE_INTEGER
    const match = value.match(/(\d+)/)
    return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER
  }
  return [...items].sort((a, b) => getOrder(a.position, a.posicao) - getOrder(b.position, b.posicao))
}

function matchesDateFilter(value: string | undefined, filter: string) {
  if (!filter) return true
  if (!value) return false

  const isoValue = toIsoDate(value)
  const isoFilter = toIsoDate(filter)

  const dayMonth = (v: string) => {
    const m = v.match(/(\d{2})\/(\d{2})/)
    return m ? `${m[1]}/${m[2]}` : undefined
  }
  const dmValue = dayMonth(value)
  const dmFilter = dayMonth(isoFilter)

  return (
    isoValue === isoFilter ||
    isoValue.startsWith(isoFilter) ||
    isoFilter.startsWith(isoValue) ||
    (!!dmValue && !!dmFilter && dmValue === dmFilter)
  )
}

// Lista de loterias principais para buscar resultados
const LOTERIAS_PRINCIPAIS = [
  'PT Rio de Janeiro',
  'PT-SP/Bandeirantes',
  'PT Bahia',
  'PT Paraíba',
  'Look Goiás',
  'Lotece',
  'Loteria Nacional',
  'Loteria Federal',
  'Boa Sorte',
]

// Buscar apenas loterias do estado selecionado (reduz de 9 para 1-2 chamadas)
const LOTERIAS_POR_UF: Record<string, string[]> = {
  RJ: ['PT Rio de Janeiro'],
  SP: ['PT-SP/Bandeirantes'],
  BA: ['PT Bahia'],
  PB: ['PT Paraíba'],
  GO: ['Look Goiás'],
  CE: ['Lotece'],
  BR: ['Loteria Nacional', 'Loteria Federal'],
}

// Nacional e Federal como opções diretas (em vez de Brasília/Belo Horizonte)
const LOTERIAS_POR_LOCACAO: Record<string, string[]> = {
  nacional: ['Loteria Nacional'],
  federal: ['Loteria Federal'],
}

// Cache em memória: key = date|uf, value = { results, expires }
const cache = new Map<string, { results: ResultadoItem[]; expires: number }>()
const CACHE_TTL_MS = 60_000 // 1 minuto
const MAX_CACHE_SIZE = 1000 // Limitar tamanho do cache para evitar memory leak

// Limpar cache expirado periodicamente
function limparCacheExpirado() {
  const now = Date.now()
  let removidos = 0
  const entries = Array.from(cache.entries())
  for (const [key, value] of entries) {
    if (now > value.expires) {
      cache.delete(key)
      removidos++
    }
  }
  // Se cache ainda estiver muito grande, remover entradas mais antigas
  if (cache.size > MAX_CACHE_SIZE) {
    const remainingEntries = Array.from(cache.entries())
    remainingEntries.sort((a, b) => a[1].expires - b[1].expires)
    const remover = remainingEntries.slice(0, cache.size - MAX_CACHE_SIZE)
    remover.forEach(([key]) => cache.delete(key))
  }
  if (removidos > 0) {
    console.log(`🧹 Cache limpo: ${removidos} entradas expiradas removidas`)
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const dateFilter = searchParams.get('date')
  const locationFilter = searchParams.get('location')
  const uf = resolveUF(locationFilter)

  try {
    const dataHoje = dateFilter || new Date().toISOString().split('T')[0]
    const locNorm = locationFilter ? normalizeText(locationFilter) : ''

    // Nacional e Federal: buscar só a loteria correspondente
    const loteriasPorLocacao = locNorm ? LOTERIAS_POR_LOCACAO[locNorm] : null
    const loteriasParaBuscar = loteriasPorLocacao
      ? loteriasPorLocacao
      : uf && LOTERIAS_POR_UF[uf]
        ? LOTERIAS_POR_UF[uf]
        : LOTERIAS_PRINCIPAIS

    const cacheKey = loteriasPorLocacao
      ? `${dataHoje}|${locNorm}`
      : `${dataHoje}|${uf || 'all'}`

    // Limpar cache expirado antes de buscar
    limparCacheExpirado()

    // Retorno instantâneo do cache se válido (dados já filtrados por cacheKey)
    const cached = cache.get(cacheKey)
    if (cached && Date.now() < cached.expires) {
      return NextResponse.json({
        results: cached.results,
        updatedAt: new Date().toISOString(),
      })
    }

    let results: ResultadoItem[] = []
    const extracaoStats: Record<string, { horarios: Set<string>, total: number }> = {}

    const buscarLoteria = async (loteriaNome: string): Promise<{ loteria: string; resultados: any[] }> => {
      try {
        const resultadosAPI = await buscarResultadosAgenciaMidas(loteriaNome, dataHoje)
        return { loteria: loteriaNome, resultados: resultadosAPI }
      } catch (error) {
        console.error(`❌ Erro ao buscar resultados para "${loteriaNome}":`, error)
        return { loteria: loteriaNome, resultados: [] }
      }
    }

    const promessasBusca = loteriasParaBuscar.map((loteriaNome) => buscarLoteria(loteriaNome))
    
    console.log(`🚀 Buscando ${loteriasParaBuscar.length} loteria(s) em paralelo (timeout: 30s)...`)
    const inicioBusca = Date.now()
    
    // Executar todas as buscas em paralelo com timeout de 30 segundos
    // Usar uma abordagem que coleta resultados conforme vão completando
    const resultadosBuscados: Array<{ loteria: string; resultados: any[] }> = []
    let timeoutReached = false
    
    // Criar um timeout que marca quando 30s passou
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        timeoutReached = true
        console.log(`⏱️ Timeout de 30s atingido. Coletando resultados parciais...`)
        resolve()
      }, 30000) // 30 segundos
    })
    
    // Executar todas as promessas e o timeout em paralelo
    const resultadosSettled = await Promise.race([
      Promise.allSettled(promessasBusca),
      timeoutPromise.then(() => Promise.allSettled(promessasBusca))
    ])
    
    // Processar resultados obtidos (mesmo que parciais)
    if (Array.isArray(resultadosSettled)) {
      resultadosSettled.forEach((settled, index) => {
        if (settled.status === 'fulfilled') {
          resultadosBuscados.push(settled.value)
        } else {
          console.error(`❌ Falha ao buscar ${loteriasParaBuscar[index]}:`, settled.reason)
        }
      })
    }
    
    const tempoBusca = Date.now() - inicioBusca
    console.log(`✅ Busca concluída em ${tempoBusca}ms (${(tempoBusca / 1000).toFixed(1)}s) - ${resultadosBuscados.length}/${loteriasParaBuscar.length} loterias processadas`)
    
    // Processar resultados obtidos
    for (const { loteria: loteriaNome, resultados: resultadosAPI } of resultadosBuscados) {
      if (resultadosAPI.length === 0) continue
      
      if (!extracaoStats[loteriaNome]) {
        extracaoStats[loteriaNome] = { horarios: new Set(), total: 0 }
      }
      
      const estadoLoteria = inferUfFromName(loteriaNome)
      const locationResolved = UF_NAME_MAP[estadoLoteria || ''] || loteriaNome
      
      resultadosAPI.forEach(resultado => {
        extracaoStats[loteriaNome].horarios.add(resultado.horario)
        
        resultado.premios.forEach((premio: { posicao: string; numero: string; grupo: string; animal: string }) => {
          extracaoStats[loteriaNome].total++
          results.push({
            position: premio.posicao,
            posicao: parseInt(premio.posicao.replace(/\D/g, ''), 10) || undefined,
            milhar: premio.numero,
            grupo: premio.grupo,
            animal: premio.animal,
            drawTime: resultado.titulo || resultado.horario,
            horario: resultado.titulo || resultado.horario,
            titulo: resultado.titulo,
            loteria: loteriaNome,
            location: locationResolved,
            date: dataHoje,
            dataExtracao: dataHoje,
            estado: estadoLoteria,
            fonte: 'agenciamidas.com',
          } as ResultadoItem)
        })
      })
    }
    
    // Logs detalhados de debug
    console.log(`📊 Total processado: ${Object.keys(extracaoStats).length} extrações, ${results.length} resultados`)
    Object.entries(extracaoStats).forEach(([nome, stats]) => {
      const horariosList = Array.from(stats.horarios).sort().join(', ')
      console.log(`📊 Extração "${nome}": ${stats.horarios.size} horário(s) - ${horariosList}`)
    })

    // Filtro por data (usa dataExtracao/data_extracao)
    if (dateFilter) {
      results = results.filter((r) => matchesDateFilter(r.dataExtracao || r.date, dateFilter))
    }
    // Filtro por UF ou nome
    if (uf) {
      results = results.filter((r) => (r.estado || '').toUpperCase() === uf)
    } else if (locationFilter) {
      const lf = normalizeText(locationFilter)
      results = results.filter((r) => normalizeText(r.location || '').includes(lf))
    }

    // Função auxiliar para converter horário em minutos para ordenação
    const timeToMinutes = (timeStr: string | undefined): number => {
      if (!timeStr) return Number.MAX_SAFE_INTEGER
      
      // Tentar formato HH:MM
      const match1 = timeStr.match(/(\d{1,2}):(\d{2})/)
      if (match1) {
        return parseInt(match1[1], 10) * 60 + parseInt(match1[2], 10)
      }
      
      // Tentar formato HHhMM
      const match2 = timeStr.match(/(\d{1,2})h(\d{2})/)
      if (match2) {
        return parseInt(match2[1], 10) * 60 + parseInt(match2[2], 10)
      }
      
      // Tentar formato HHh
      const match3 = timeStr.match(/(\d{1,2})h/)
      if (match3) {
        return parseInt(match3[1], 10) * 60
      }
      
      return Number.MAX_SAFE_INTEGER
    }
    
    // Ordenar e limitar em 7 posições por sorteio
    // Agrupar por loteria primeiro, depois por horário e data
    const grouped: Record<string, ResultadoItem[]> = {}
    results.forEach((r) => {
      // Usar loteria como parte principal da chave para garantir agrupamento correto
      const loteriaNormalizada = (r.loteria || r.location || '').toLowerCase().trim()
      const key = `${loteriaNormalizada}|${r.drawTime || ''}|${r.date || ''}`
      grouped[key] = grouped[key] || []
      grouped[key].push(r)
    })
    
    const gruposUnicos = Object.keys(grouped)
    console.log(`✅ Resultados finais: ${gruposUnicos.length} grupos únicos (loteria|horário|data), ${results.length} resultados totais`)
    
    // Log detalhado dos grupos por loteria para debug
    const gruposPorLoteria: Record<string, string[]> = {}
    gruposUnicos.forEach(key => {
      const [loteria] = key.split('|')
      if (!gruposPorLoteria[loteria]) {
        gruposPorLoteria[loteria] = []
      }
      gruposPorLoteria[loteria].push(key)
    })
    
    console.log(`📋 Grupos por loteria:`)
    Object.entries(gruposPorLoteria).forEach(([loteria, grupos]) => {
      const horarios = grupos.map(g => {
        const [, horario] = g.split('|')
        return horario
      }).filter(h => h).sort()
      console.log(`   "${loteria}": ${grupos.length} grupo(s) - horários: ${horarios.join(', ')}`)
    })
    
    // Ordenar grupos por data (mais recente primeiro) e depois por horário (mais cedo primeiro)
    const gruposOrdenados = Object.entries(grouped)
      .sort(([keyA], [keyB]) => {
        const [, , dateA] = keyA.split('|')
        const [, , dateB] = keyB.split('|')
        
        // Ordenar por data (mais recente primeiro)
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA)
        }
        
        // Se mesma data, ordenar por horário (mais cedo primeiro)
        const [, timeA] = keyA.split('|')
        const [, timeB] = keyB.split('|')
        const minutosA = timeToMinutes(timeA)
        const minutosB = timeToMinutes(timeB)
        
        return minutosA - minutosB
      })
    
    results = gruposOrdenados
      .map(([, arr]) => orderByPosition(arr).slice(0, 7))
      .flat()

    // Armazenar no cache para retorno instantâneo em requisições repetidas
    cache.set(cacheKey, {
      results,
      expires: Date.now() + CACHE_TTL_MS,
    })

    const payload: ResultadosResponse = {
      results,
      updatedAt: new Date().toISOString(),
    }

    return NextResponse.json(payload, { status: 200, headers: { 'Cache-Control': 'no-cache' } })
  } catch (error) {
    console.error('Erro ao buscar resultados externos:', error)
    return NextResponse.json(
      {
        results: [],
        updatedAt: new Date().toISOString(),
        error: 'Falha ao buscar resultados externos',
      } satisfies ResultadosResponse & { error: string },
      { status: 502 }
    )
  }
}
