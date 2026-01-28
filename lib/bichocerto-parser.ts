/**
 * Parser de Resultados do Bicho Certo
 * 
 * Busca resultados diretamente do site oficial bichocerto.com
 * através de parsing HTML.
 */

export interface BichoCertoResultado {
  horario: string
  titulo: string
  premios: Array<{
    posicao: string // "1º", "2º", "7º"
    numero: string // "8051" (sempre 4 dígitos)
    grupo: string // "13"
    animal: string // "Galo"
  }>
}

export interface BichoCertoResultadoCompleto {
  loteria: string
  codigo: string
  data: string
  resultados: BichoCertoResultado[]
}

/**
 * Mapeamento de códigos de loteria para o bichocerto.com
 */
const CODIGO_LOTERIA_MAP: Record<string, string> = {
  'ln': 'ln', // NACIONAL
  'sp': 'sp', // PT SP
  'ba': 'ba', // PT BAHIA
  'pb': 'pb', // LOTEP
  'bs': 'bs', // BOA SORTE
  'lce': 'lce', // LOTECE
  'lk': 'lk', // LOOK
  'fd': 'fd', // FEDERAL
  'rj': 'rj', // PT RIO DE JANEIRO
}

/**
 * Converte nome da loteria para código do bichocerto.com
 */
function nomeParaCodigo(nomeLoteria: string): string | null {
  const nomeLower = nomeLoteria.toLowerCase().trim()
  
  // Mapeamentos diretos
  const map: Record<string, string> = {
    'pt rio': 'rj',
    'pt rio de janeiro': 'rj',
    'pt-rio': 'rj',
    'pt-rio de janeiro': 'rj',
    'mpt-rio': 'rj',
    'mpt rio': 'rj',
    'pt sp': 'sp',
    'pt-sp': 'sp',
    'pt sp bandeirantes': 'sp',
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
  
  if (map[nomeLower]) {
    return map[nomeLower]
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
 * Limpa HTML removendo JavaScript do início
 */
function limparHTML(html: string): string {
  // Remove JavaScript do início da resposta
  if (html.startsWith('jQuery') || html.startsWith('document')) {
    const jsEnd = html.indexOf('</script>')
    if (jsEnd > 0) {
      html = html.substring(jsEnd + 9)
    }
  }
  
  // Remove outros padrões de JavaScript
  html = html.replace(/^[^<]*<script[^>]*>[\s\S]*?<\/script>/i, '')
  
  return html.trim()
}

/**
 * Extrai prêmios de uma tabela HTML
 */
function extrairPremiosDaTabela(tableHTML: string, horarioId: string): Array<{
  posicao: string
  numero: string
  grupo: string
  animal: string
}> {
  const premios: Array<{ posicao: string; numero: string; grupo: string; animal: string }> = []
  const posicoesExtraidas = new Set<string>()
  
  // Regex para encontrar linhas da tabela (<tr>...</tr>)
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let match
  
  while ((match = trRegex.exec(tableHTML)) !== null) {
    const trContent = match[1]
    
    // Ignorar linhas com "SUPER 5" que não são prêmios
    if (trContent.includes('SUPER 5') || trContent.includes('super 5')) {
      continue
    }
    
    // Extrair células (<td>...</td>)
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi
    const celulas: string[] = []
    let tdMatch
    
    while ((tdMatch = tdRegex.exec(trContent)) !== null) {
      // Remover tags HTML e limpar texto
      let texto = tdMatch[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim()
      celulas.push(texto)
    }
    
    if (celulas.length < 3) continue
    
    // Primeira coluna: posição (1º, 2º, etc.)
    let posicao = ''
    for (let i = 0; i < Math.min(3, celulas.length); i++) {
      const matchPos = celulas[i].match(/(\d+)[º°oO]?/)
      if (matchPos) {
        posicao = `${matchPos[1]}º`
        break
      }
    }
    
    if (!posicao) continue
    
    // Evitar duplicatas de posição
    if (posicoesExtraidas.has(posicao)) {
      console.log(`⚠️ Duplicata de posição ${posicao} ignorada na tabela ${horarioId}`)
      continue
    }
    posicoesExtraidas.add(posicao)
    
    // Buscar número (4 dígitos) - pode estar em qualquer coluna
    let numero = ''
    for (const celula of celulas) {
      // Remover espaços e caracteres não numéricos para busca
      const numerosNaCelula = celula.replace(/\D/g, '')
      
      // Priorizar números de 4 dígitos
      const match4digitos = numerosNaCelula.match(/(\d{4})/)
      if (match4digitos) {
        numero = match4digitos[1]
        break
      }
      
      // Depois números de 3 dígitos (normalizar para 4)
      const match3digitos = numerosNaCelula.match(/(\d{3})/)
      if (match3digitos) {
        // Números de 3 dígitos são sempre milhares começando com zero
        numero = match3digitos[1].padStart(4, '0')
        break
      }
    }
    
    if (!numero) continue
    
    // Buscar grupo (1-2 dígitos entre 1-25)
    let grupo = ''
    for (const celula of celulas) {
      const numerosNaCelula = celula.replace(/\D/g, '')
      const matchGrupo = numerosNaCelula.match(/^(\d{1,2})$/)
      if (matchGrupo) {
        const numGrupo = parseInt(matchGrupo[1], 10)
        if (numGrupo >= 1 && numGrupo <= 25) {
          grupo = matchGrupo[1].padStart(2, '0')
          break
        }
      }
    }
    
    // Buscar animal (texto não numérico na última coluna)
    let animal = ''
    for (let i = celulas.length - 1; i >= 0; i--) {
      const celula = celulas[i]
      // Se não é só número, pode ser animal
      if (celula && !/^\d+$/.test(celula.replace(/\s/g, ''))) {
        animal = celula.trim()
        break
      }
    }
    
    premios.push({
      posicao,
      numero,
      grupo: grupo || '',
      animal: animal || '',
    })
    
    console.log(`🔍 ${posicao} PRÊMIO extraído: número="${numero}", grupo="${grupo}", animal="${animal}"`)
  }
  
  return premios
}

/**
 * Parseia HTML retornado pelo bichocerto.com
 */
function parsearHTML(html: string): BichoCertoResultado[] {
  html = limparHTML(html)
  
  console.log(`🔍 HTML limpo: ${html.length} caracteres`)
  
  // Verificar estrutura básica
  const temDivDisplay = /div_display_\d+/i.test(html)
  const temTable = /<table[^>]*id=["']table_\d+["']/i.test(html)
  
  console.log(`🔍 Estrutura HTML: tem div_display=${temDivDisplay}, tem table=${temTable}`)
  
  if (!temDivDisplay && !temTable) {
    console.log('⚠️ Nenhum resultado encontrado no HTML')
    return []
  }
  
  // Buscar todas as divs com padrão div_display_XX
  const divRegex = /<div[^>]*id=["']div_display_(\d+)["'][^>]*>([\s\S]*?)<\/div>/gi
  const resultados: BichoCertoResultado[] = []
  const divsEncontradas = new Set<string>()
  
  let divMatch
  while ((divMatch = divRegex.exec(html)) !== null) {
    const horarioId = divMatch[1]
    const divContent = divMatch[2]
    
    if (divsEncontradas.has(horarioId)) continue
    divsEncontradas.add(horarioId)
    
    // Extrair título (geralmente em <h5>)
    const tituloMatch = divContent.match(/<h5[^>]*>([\s\S]*?)<\/h5>/i)
    const titulo = tituloMatch ? tituloMatch[1].replace(/<[^>]+>/g, '').trim() : `Resultado ${horarioId}`
    
    // Buscar tabela correspondente
    const tableRegex = new RegExp(`<table[^>]*id=["']table_${horarioId}["'][^>]*>([\\s\\S]*?)<\\/table>`, 'i')
    const tableMatch = divContent.match(tableRegex) || html.match(tableRegex)
    
    if (!tableMatch) {
      console.log(`⚠️ Tabela table_${horarioId} não encontrada`)
      continue
    }
    
    const tableHTML = tableMatch[1]
    const premios = extrairPremiosDaTabela(tableHTML, horarioId)
    
    if (premios.length === 0) {
      console.log(`⚠️ Nenhum prêmio extraído da tabela ${horarioId}`)
      continue
    }
    
    // Extrair horário do título
    const horarioMatch = titulo.match(/(\d{1,2}):(\d{2})/)
    const horario = horarioMatch ? `${horarioMatch[1].padStart(2, '0')}:${horarioMatch[2]}` : horarioId
    
    resultados.push({
      horario,
      titulo,
      premios,
    })
    
    console.log(`📊 Div ${horarioId}: ${premios.length} prêmio(s) extraído(s)`)
    const posicoes = premios.map(p => p.posicao).join(', ')
    console.log(`   Posições extraídas: ${posicoes}`)
  }
  
  console.log(`✅ Total de ${resultados.length} resultado(s) extraído(s)`)
  
  // Ordenar resultados por horário (cronologicamente)
  resultados.sort((a, b) => {
    // Converter horário para minutos para comparação
    const timeToMinutes = (timeStr: string): number => {
      const match = timeStr.match(/(\d{1,2}):(\d{2})/)
      if (match) {
        return parseInt(match[1], 10) * 60 + parseInt(match[2], 10)
      }
      // Se não conseguir parsear, tentar usar o ID numérico
      const idMatch = timeStr.match(/(\d+)/)
      if (idMatch) {
        return parseInt(idMatch[1], 10)
      }
      return Number.MAX_SAFE_INTEGER
    }
    
    return timeToMinutes(a.horario) - timeToMinutes(b.horario)
  })
  
  // Log da ordem final
  const horariosOrdenados = resultados.map(r => r.horario).join(', ')
  console.log(`📋 Horários ordenados: ${horariosOrdenados}`)
  
  return resultados
}

/**
 * Busca resultados do bichocerto.com para uma loteria e data específicas
 */
export async function buscarResultadosBichoCerto(
  nomeLoteria: string,
  data: string | Date
): Promise<BichoCertoResultado[]> {
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
  
  console.log(`🔍 Buscando resultados: loteria="${nomeLoteria}" (código: ${codigo}), data="${dataStr}"`)
  
  const url = 'https://bichocerto.com/resultados/base/resultado/'
  
  // Preparar headers
  const headers: HeadersInit = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  }
  
  // Adicionar cookie PHPSESSID se disponível (para acesso histórico)
  const phpsessid = process.env.BICHOCERTO_PHPSESSID
  if (phpsessid) {
    headers['Cookie'] = `PHPSESSID=${phpsessid}`
  }
  
  // Preparar body
  const body = new URLSearchParams({
    l: codigo,
    d: dataStr,
  })
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: body.toString(),
      cache: 'no-store',
    })
    
    if (!response.ok) {
      console.error(`❌ Erro HTTP ${response.status} ao buscar resultados`)
      return []
    }
    
    const html = await response.text()
    
    if (!html || html.length < 100) {
      console.log('⚠️ Resposta HTML muito curta ou vazia')
      return []
    }
    
    const resultados = parsearHTML(html)
    
    return resultados
  } catch (error) {
    console.error('❌ Erro ao buscar resultados do bichocerto.com:', error)
    return []
  }
}

/**
 * Busca resultados de múltiplas loterias
 */
export async function buscarResultadosMultiplasLoterias(
  loterias: string[],
  data: string | Date
): Promise<BichoCertoResultadoCompleto[]> {
  const resultados: BichoCertoResultadoCompleto[] = []
  
  for (const loteria of loterias) {
    const codigo = nomeParaCodigo(loteria)
    if (!codigo) continue
    
    const resultadosLoteria = await buscarResultadosBichoCerto(loteria, data)
    
    if (resultadosLoteria.length > 0) {
      resultados.push({
        loteria,
        codigo,
        data: data instanceof Date ? data.toISOString().split('T')[0] : data,
        resultados: resultadosLoteria,
      })
    }
    
    // Pequeno delay para evitar rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  return resultados
}
