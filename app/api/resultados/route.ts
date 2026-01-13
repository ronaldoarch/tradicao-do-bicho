import { NextRequest, NextResponse } from 'next/server'
import { ResultadosResponse, ResultadoItem } from '@/types/resultados'
import { toIsoDate } from '@/lib/resultados-helpers'

const RAW_SOURCE =
  process.env.BICHO_CERTO_API ?? 'https://okgkgswwkk8ows0csow0c4gg.agenciamidas.com/api/resultados'
const SOURCE_ROOT = RAW_SOURCE.replace(/\/api\/resultados$/, '')

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

function buildUrl(uf?: string) {
  if (uf) return `${SOURCE_ROOT}/api/resultados/estado/${uf}`
  return `${SOURCE_ROOT}/api/resultados`
}

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
  return raw.map((r: any, idx: number) => ({
    position: r.position || r.premio || `${idx + 1}°`,
    milhar: r.milhar || r.numero || r.milharNumero || r.valor || '',
    grupo: r.grupo || r.grupoNumero || '',
    animal: r.animal || r.nomeAnimal || '',
    drawTime: r.horario || r.drawTime || r.concurso || '',
    loteria: r.loteria || r.nomeLoteria || r.concurso || r.horario || '',
    location: r.local || r.estado || r.cidade || r.uf || '',
    date: r.data || r.date || r.dia || '',
    estado: r.estado || inferUfFromName(r.estado) || inferUfFromName(r.loteria) || undefined,
  }))
}

function matchesDateFilter(value: string | undefined, filter: string) {
  if (!filter) return true
  if (!value) return false

  const isoValue = toIsoDate(value)
  const isoFilter = toIsoDate(filter)

  // Se a fonte não traz ano (ex.: 13/01), comparar só dia/mês
  const dayMonth = (v: string) => {
    const m = v.match(/(\d{2})\/(\d{2})/)
    return m ? `${m[1]}/${m[2]}` : undefined
  }
  const dmValue = dayMonth(value)
  const dmFilter = dayMonth(isoFilter)

  return (
    value.includes(filter) ||
    isoValue.startsWith(isoFilter) ||
    isoFilter.startsWith(isoValue) ||
    value.includes(isoFilter) ||
    (!!dmValue && !!dmFilter && dmValue === dmFilter)
  )
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const dateFilter = searchParams.get('date') // mantido apenas para futura compatibilidade, não filtramos
  const locationFilter = searchParams.get('location') // mantido apenas para futura compatibilidade, não filtramos
  const uf = resolveUF(locationFilter)

  try {
    // Sempre buscamos a rota geral para não perder resultados por filtros do upstream
    let res = await fetch(buildUrl(undefined), { cache: 'no-store' })
    if (!res.ok) throw new Error(`Upstream status ${res.status}`)

    const data = await res.json()
    const rawResults = data?.resultados ?? data?.results ?? []
    let results = normalizeResults(rawResults)
    // Sem filtros de data/estado na API: deixamos o frontend agrupar/filtrar se necessário.

    const payload: ResultadosResponse = {
      results,
      updatedAt: data?.updatedAt || new Date().toISOString(),
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
