/**
 * API de Resultados da Agência Midas
 * 
 * Busca resultados diretamente da API oficial
 * https://rk48ccsoo8kcooc00wwwog04.agenciamidas.com/api_resultados.php
 */

export interface AgenciaMidasResultado {
  horario: string
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
 * Converte resposta da API para formato interno
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
  
  // A API pode retornar dados como objeto ou array
  const extracoes = Array.isArray(resposta.dados) 
    ? resposta.dados 
    : Object.values(resposta.dados)

  extracoes.forEach((extracao, index) => {
    if (!extracao.premios || !Array.isArray(extracao.premios)) {
      return
    }

    const premios = extracao.premios.map((premio, premioIndex) => {
      // Tentar extrair posição do prêmio
      let posicao = premio.posicao
      if (!posicao) {
        // Se não tem posição explícita, usar índice + 1
        posicao = `${premioIndex + 1}º`
      }

      // Extrair grupo se não fornecido
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

    // Usar horário da extração ou um padrão
    const horario = extracao.horario || `${String(8 + index).padStart(2, '0')}:00`

    resultados.push({
      horario,
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
    console.log(`📥 Content-Type: ${contentType}`)
    
    // Verificar se a resposta é texto simples (não JSON)
    const trimmedText = responseText.trim()
    
    // Se não começa com { ou [, não é JSON válido
    if (!trimmedText.startsWith('{') && !trimmedText.startsWith('[')) {
      // Verificar se é uma mensagem de texto conhecida
      if (trimmedText.includes('Resultados encontrados') || 
          trimmedText.includes('Nenhum resultado') || 
          trimmedText.includes('erro') ||
          trimmedText.includes('Resultado Nacional')) {
        console.log(`ℹ️ API retornou mensagem de texto (sem resultados JSON): ${trimmedText.substring(0, 150)}`)
        return []
      }
      
      // Se parece HTML, também retornar vazio
      if (trimmedText.includes('<!DOCTYPE') || trimmedText.includes('<html')) {
        console.log(`⚠️ API retornou HTML ao invés de JSON`)
        return []
      }
      
      // Qualquer outro texto não-JSON retorna vazio
      console.log(`⚠️ Resposta não é JSON válido. Retornando array vazio.`)
      return []
    }
    
    // Tentar fazer parse do JSON
    let resultado: AgenciaMidasResponse
    try {
      resultado = JSON.parse(responseText)
    } catch (parseError) {
      console.error(`❌ Erro ao fazer parse do JSON. Resposta (primeiros 200 chars): ${responseText.substring(0, 200)}`)
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
