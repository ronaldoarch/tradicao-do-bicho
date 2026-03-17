/**
 * API de Resultados da Agência Midas
 * 
 * Busca resultados diretamente da API oficial
 * https://rk48ccsoo8kcooc00wwwog04.agenciamidas.com/api_resultados.php
 */

import { extracoes } from '@/data/extracoes'
import { ANIMALS } from '@/data/animals'

export interface AgenciaMidasResultado {
  horario: string
  titulo?: string // ex: "Resultado LOOK-GO 14:20" - título completo da API
  premios: Array<{
    posicao: string // "1º", "2º", "7º"
    numero: string // "8051" (sempre 4 dígitos)
    grupo: string // "13"
    animal: string // "Galo"
  }>
}

export interface AgenciaMidasExtracao {
  premios: Array<{
    numero: string
    animal: string
    posicao?: string
    grupo?: string
  }>
  horario?: string
  titulo?: string // ex: "Resultado LOOK-GO 14:20" - contém horário completo
  data?: string
}

export interface AgenciaMidasResponse {
  erro?: string
  dados?: Record<string, AgenciaMidasExtracao> | AgenciaMidasExtracao[]
}

/**
 * Mapeamento de nomes de loteria para códigos da API
 */
const CODIGO_LOTERIA_MAP: Record<string, string> = {
  'pt rio de janeiro': 'rj',
  'pt-rio de janeiro': 'rj',
  'pt rio': 'rj',
  'pt-rio': 'rj',
  'mpt-rio': 'rj',
  'mpt rio': 'rj',
  'pt sp': 'sp',
  'pt-sp': 'sp',
  'pt sp bandeirantes': 'sp',
  'pt-sp/bandeirantes': 'sp',
  'bandeirantes': 'sp',
  'pt bahia': 'ba',
  'pt-ba': 'ba',
  'maluca bahia': 'ba',
  'lotep': 'pb',
  'pt paraiba': 'pb',
  'pt paraíba': 'pb',
  'pt-pb': 'pb',
  'look': 'lk',
  'look goias': 'lk',
  'look goiás': 'lk',
  'lotece': 'lce',
  'pt ceara': 'lce',
  'pt ceará': 'lce',
  'nacional': 'ln',
  'loteria nacional': 'ln',
  'para todos': 'ln',
  'br': 'ln', // sigla estado usado em algumas UIs
  'federal': 'fd',
  'loteria federal': 'fd',
  'boa sorte': 'bs',
}

/**
 * Converte nome da loteria para código da API
 */
function nomeParaCodigo(nomeLoteria: string): string | null {
  const nomeLower = nomeLoteria.toLowerCase().trim()
  
  // Mapeamentos diretos
  if (CODIGO_LOTERIA_MAP[nomeLower]) {
    return CODIGO_LOTERIA_MAP[nomeLower]
  }
  
  // Busca por palavras-chave
  if (nomeLower.includes('rio') || nomeLower.includes('rj')) return 'rj'
  if (nomeLower.includes('sp') || nomeLower.includes('são paulo') || nomeLower.includes('sao paulo')) return 'sp'
  if (nomeLower.includes('bahia') || nomeLower.includes('ba')) return 'ba'
  if (nomeLower.includes('paraiba') || nomeLower.includes('paraíba') || nomeLower.includes('pb')) return 'pb'
  if (nomeLower.includes('goias') || nomeLower.includes('goiás') || nomeLower.includes('go')) return 'lk'
  if (nomeLower.includes('ceara') || nomeLower.includes('ceará') || nomeLower.includes('ce')) return 'lce'
  if (nomeLower.includes('nacional') || nomeLower.includes('ln')) return 'ln'
  if (nomeLower.includes('federal') || nomeLower.includes('fd')) return 'fd'
  
  return null
}

/**
 * LOTEP (PB) e LOTECE (CE): só são sorteados os 5 primeiros prêmios.
 * 6º = (1º+2º+3º+4º+5º) mod 10000
 * 7º = floor((1º×2º)/1000) mod 1000, exibido como 4 dígitos (ex: 858 → "0858")
 */
function calcularPremiosLotepLotece(premios: Array<{ posicao: string; numero: string; grupo: string; animal: string }>): Array<{ posicao: string; numero: string; grupo: string; animal: string }> {
  if (!premios || premios.length < 5) return premios
  const p = premios.slice(0, 5).map((x) => parseInt(x.numero.replace(/\D/g, '').padStart(4, '0').slice(-4), 10))
  const soma = p[0] + p[1] + p[2] + p[3] + p[4]
  const sexto = soma % 10000
  const setimo = Math.floor((p[0] * p[1]) / 1000) % 1000
  const numero6 = String(sexto).padStart(4, '0')
  const numero7 = String(setimo).padStart(4, '0')
  const grupoFromNumero = (n: string) => {
    const num = parseInt(n.replace(/\D/g, ''), 10)
    if (isNaN(num)) return ''
    const dezena = num % 100
    if (dezena === 0) return '25'
    return String(Math.floor((dezena - 1) / 4) + 1).padStart(2, '0')
  }
  const animalFromGrupo = (g: string) => {
    const id = parseInt(g, 10)
    if (id < 1 || id > 25) return ''
    return ANIMALS[id - 1]?.name ?? ''
  }
  const g6 = grupoFromNumero(numero6)
  const g7 = grupoFromNumero(numero7)
  return [
    ...premios.slice(0, 5),
    { posicao: '6º', numero: numero6, grupo: g6, animal: animalFromGrupo(g6) },
    { posicao: '7º', numero: numero7, grupo: g7, animal: animalFromGrupo(g7) },
  ]
}

/**
 * Extrai grupo do número (últimos 2 dígitos)
 */
function extrairGrupo(numero: string): string {
  const num = numero.replace(/\D/g, '')
  if (num.length >= 2) {
    const grupo = parseInt(num.slice(-2), 10)
    if (grupo >= 1 && grupo <= 25) {
      return grupo.toString().padStart(2, '0')
    }
  }
  return ''
}

/**
 * Normaliza chave de horário para "HH:MM".
 * Usado por todas as loterias/estados (RJ, SP, BA, PB, GO, CE, BR).
 * Aceita: "21:00", "21h", "21h00", "21h0", "9h20", "9:20", "09h20", "21"
 */
export function normalizarChaveHorario(chave: string): string | null {
  if (!chave || typeof chave !== 'string') return null
  const s = chave.trim().toLowerCase().replace(/\s/g, '')
  // Já no formato HH:MM ou H:MM
  const matchColon = s.match(/^(\d{1,2}):(\d{1,2})$/)
  if (matchColon) {
    const h = parseInt(matchColon[1], 10)
    const m = parseInt(matchColon[2], 10)
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
  }
  // Formato "21h", "21h00", "21h0", "9h20", "09h20"
  const matchH = s.match(/^(\d{1,2})h(\d{1,2})?$/)
  if (matchH) {
    const h = parseInt(matchH[1], 10)
    const m = matchH[2] ? parseInt(matchH[2], 10) : 0
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
  }
  // Apenas número (hora)
  const matchNum = s.match(/^(\d{1,2})$/)
  if (matchNum) {
    const h = parseInt(matchNum[1], 10)
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, '0')}:00`
  }
  return null
}

/**
 * Extrai horário completo (HH:MM) do campo titulo da API.
 * Ex: "Resultado LOOK-GO 14:20" -> "14:20", "Resultado PT-RJ 09:30" -> "09:30"
 */
function extrairHorarioDoTitulo(titulo?: string | null): string | null {
  if (!titulo || typeof titulo !== 'string') return null
  const m = titulo.match(/(\d{1,2}):(\d{2})\s*$/)
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null
}

/**
 * Extrai a hora (0-23) de um horário "HH:MM" ou string como "7", "11", "11h20"
 */
function extrairHora(horario: string): number | null {
  if (!horario || typeof horario !== 'string') return null
  const norm = normalizarChaveHorario(horario) || horario.trim()
  const m = norm.match(/^(\d{1,2})/)
  return m ? parseInt(m[1], 10) : null
}

/**
 * Encontra em temposPorIndice o horário que corresponde à hora da API.
 * Ex: API "7" ou "07:00" -> hora 7 -> para LOOK retorna "07:20"
 */
function encontrarHorarioPorHora(temposPorIndice: string[], horaApi: number): string | null {
  if (horaApi < 0 || horaApi > 23) return null
  const match = temposPorIndice.find((t) => {
    const h = parseInt(t.split(':')[0], 10)
    return h === horaApi
  })
  return match || null
}

/**
 * Mapeia nome da loteria (ex: "Look Goiás") para nome da extração (ex: "LOOK")
 * para buscar horários corretos em extracoes.
 */
function nomeLoteriaParaExtracao(nomeLoteria: string): string {
  const n = nomeLoteria.toLowerCase().trim()
  if (n.includes('look')) return 'look'
  if (n.includes('lotep')) return 'lotep'
  if (n.includes('lotece')) return 'lotece'
  if (n.includes('paraiba') || n.includes('paraíba')) return 'lotep'
  if (n.includes('para todos')) return 'para todos'
  if ((n.includes('rio') || n.includes('rj')) && !n.includes('grande')) return 'pt rio'
  if (n.includes('federal')) return 'federal'
  if (n.includes('nacional')) return 'nacional'
  if (n.includes('bahia')) return 'pt bahia'
  if (n.includes('bandeirantes')) return 'pt sp (band)'
  if (n.includes('sp') || n.includes('são paulo') || n.includes('sao paulo')) return 'pt sp'
  return n
}

/**
 * Converte resposta da API para formato interno.
 * Aplica a todas as loterias/estados (PT RIO/RJ, PT SP/SP, PT BAHIA/BA, LOTEP/PB, LOOK/GO, LOTECE/CE, NACIONAL/BR, FEDERAL/BR).
 * Se dados for objeto, usa a chave como horário (ex: "21:00", "09:20") para evitar troca de extrações entre horários.
 */
function converterResposta(
  resposta: AgenciaMidasResponse,
  loteria: string,
  data: string
): AgenciaMidasResultado[] {
  if (resposta.erro || !resposta.dados) {
    return []
  }

  const resultados: AgenciaMidasResultado[] = []
  const dados = resposta.dados

  // Quando a API retorna objeto, as chaves podem ser os horários (ex: "08:00", "21:00")
  const ehObjeto = !Array.isArray(dados) && typeof dados === 'object'
  const entradas: [string | number, AgenciaMidasExtracao][] = ehObjeto
    ? Object.entries(dados)
    : (dados as AgenciaMidasExtracao[]).map((ext, i) => [i, ext])

  const nomeExtracao = nomeLoteriaParaExtracao(loteria)
  const temposPorIndice = extracoes
    .filter((e) => e.name && e.name.toLowerCase() === nomeExtracao)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
    .map((e) => e.time || '00:00')

  entradas.forEach(([chaveOuIndice, extracao], index) => {
    if (!extracao.premios || !Array.isArray(extracao.premios)) {
      return
    }

    let premios = extracao.premios.map((premio, premioIndex) => {
      let posicao = premio.posicao
      if (!posicao) {
        posicao = `${premioIndex + 1}º`
      }
      let grupo = premio.grupo
      if (!grupo && premio.numero) {
        grupo = extrairGrupo(premio.numero)
      }
      return {
        posicao,
        numero: premio.numero?.padStart(4, '0') || '',
        grupo: grupo || '',
        animal: premio.animal || '',
      }
    })

    // LOTEP (PB) e LOTECE (CE): só são sorteados 5 prêmios; 6º e 7º são calculados. Exibir só 7 prêmios.
    if (nomeExtracao === 'lotep' || nomeExtracao === 'lotece') {
      premios = calcularPremiosLotepLotece(premios)
    } else if (premios.length > 7) {
      premios = premios.slice(0, 7)
    }

    // A API retorna: horario="11" (só hora), titulo="Resultado LOOK-GO 11:20" (horário completo)
    // Prioridade: titulo (exato) > nossa lista por hora > horario/chave normalizado
    const horarioTitulo = extrairHorarioDoTitulo(extracao.titulo)
    const valorApi = extracao.horario ?? (ehObjeto && typeof chaveOuIndice === 'string' ? chaveOuIndice : null)
    const normApi = valorApi ? normalizarChaveHorario(valorApi) : null
    const horaApi = valorApi ? extrairHora(valorApi) : null

    let horario: string | null = horarioTitulo
    if (!horario && temposPorIndice.length > 0 && horaApi !== null) {
      horario = encontrarHorarioPorHora(temposPorIndice, horaApi)
    }
    if (!horario && normApi) horario = normApi
    if (!horario && temposPorIndice[index]) horario = temposPorIndice[index]
    if (!horario) horario = normApi ?? temposPorIndice[index] ?? `${String(8 + index).padStart(2, '0')}:00`

    resultados.push({
      horario,
      titulo: extracao.titulo || undefined,
      premios,
    })
  })

  return resultados
}

/**
 * Busca resultados da API da Agência Midas para uma loteria e data específicas
 */
export async function buscarResultadosAgenciaMidas(
  nomeLoteria: string,
  data: string | Date
): Promise<AgenciaMidasResultado[]> {
  const codigo = nomeParaCodigo(nomeLoteria)
  
  if (!codigo) {
    console.log(`⚠️ Código não encontrado para loteria: ${nomeLoteria}`)
    return []
  }
  
  // Converter data para formato YYYY-MM-DD
  let dataStr: string
  if (data instanceof Date) {
    dataStr = data.toISOString().split('T')[0]
  } else {
    // Tentar converter formato brasileiro DD/MM/YYYY para YYYY-MM-DD
    const matchBR = data.match(/(\d{2})\/(\d{2})\/(\d{4})/)
    if (matchBR) {
      const [, dia, mes, ano] = matchBR
      dataStr = `${ano}-${mes}-${dia}`
    } else {
      dataStr = data
    }
  }
  
  console.log(`🔍 Buscando resultados da API Agência Midas: loteria="${nomeLoteria}" (código: ${codigo}), data="${dataStr}"`)
  
  const apiUrl = 'https://rk48ccsoo8kcooc00wwwog04.agenciamidas.com/api_resultados.php'
  const url = `${apiUrl}?acao=buscar&loteria=${codigo}&data=${dataStr}`
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(30000), // Timeout de 30 segundos
    })
    
    if (!response.ok) {
      console.error(`❌ Erro HTTP ${response.status} ao buscar resultados da API Agência Midas`)
      return []
    }
    
    // Ler resposta como texto primeiro
    const responseText = await response.text()
    const contentType = response.headers.get('content-type') || ''
    
    // Log da resposta para debug
    console.log(`📥 Resposta da API (primeiros 200 chars): ${responseText.substring(0, 200)}`)
    
    // A API retorna texto antes do JSON (ex: "Resultados encontrados:...")
    // Precisamos extrair apenas a parte JSON
    let jsonText = responseText.trim()
    
    // Encontrar o início do JSON (primeiro { ou [)
    const jsonStart = jsonText.indexOf('{')
    const jsonStartArray = jsonText.indexOf('[')
    
    let jsonStartIndex = -1
    if (jsonStart !== -1 && jsonStartArray !== -1) {
      jsonStartIndex = Math.min(jsonStart, jsonStartArray)
    } else if (jsonStart !== -1) {
      jsonStartIndex = jsonStart
    } else if (jsonStartArray !== -1) {
      jsonStartIndex = jsonStartArray
    }
    
    // Se encontrou início do JSON, extrair apenas essa parte
    if (jsonStartIndex !== -1 && jsonStartIndex > 0) {
      console.log(`📝 Extraindo JSON da posição ${jsonStartIndex} (removendo ${jsonStartIndex} caracteres de texto inicial)`)
      jsonText = jsonText.substring(jsonStartIndex)
    }
    
    // Se ainda não começa com { ou [, não há JSON válido
    if (!jsonText.trim().startsWith('{') && !jsonText.trim().startsWith('[')) {
      console.log(`⚠️ Nenhum JSON encontrado na resposta. Retornando array vazio.`)
      return []
    }
    
    // Tentar fazer parse do JSON
    let resultado: AgenciaMidasResponse
    try {
      resultado = JSON.parse(jsonText)
    } catch (parseError) {
      console.error(`❌ Erro ao fazer parse do JSON. JSON extraído (primeiros 200 chars): ${jsonText.substring(0, 200)}`)
      return []
    }
    
    if (resultado.erro) {
      console.log(`⚠️ Erro na resposta da API: ${resultado.erro}`)
      return []
    }
    
    const resultados = converterResposta(resultado, nomeLoteria, dataStr)
    
    console.log(`✅ ${resultados.length} resultado(s) obtido(s) da API Agência Midas`)
    
    return resultados
  } catch (error) {
    console.error('❌ Erro ao buscar resultados da API Agência Midas:', error)
    return []
  }
}
