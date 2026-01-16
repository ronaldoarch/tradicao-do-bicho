/**
 * Funções auxiliares para processamento de resultados
 */

import { extracoes, type Extracao } from '@/data/extracoes'
import { getHorarioRealApuracao } from '@/data/horarios-reais-apuracao'

/**
 * Converte uma data em formato brasileiro (DD/MM/YYYY) ou ISO (YYYY-MM-DD) para formato ISO
 * 
 * @param dateString Data em formato brasileiro ou ISO
 * @returns Data em formato ISO (YYYY-MM-DD)
 */
export function toIsoDate(dateString?: string): string {
  if (!dateString) return ''
  
  // Se já está em formato ISO, retornar como está
  if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
    return dateString.split('T')[0] // Remove hora se houver
  }
  
  // Tentar formato brasileiro DD/MM/YYYY
  const matchBR = dateString.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (matchBR) {
    const [, dia, mes, ano] = matchBR
    return `${ano}-${mes}-${dia}`
  }
  
  // Tentar formato DD-MM-YYYY
  const matchDash = dateString.match(/(\d{2})-(\d{2})-(\d{4})/)
  if (matchDash) {
    const [, dia, mes, ano] = matchDash
    return `${ano}-${mes}-${dia}`
  }
  
  // Retornar original se não conseguir converter
  return dateString
}

/**
 * Formata uma data para exibição em português
 * 
 * @param dateString Data em qualquer formato
 * @returns Data formatada (ex: "15 de Janeiro de 2026")
 */
export function formatDateLabel(dateString?: string): string {
  if (!dateString) return ''
  
  const isoDate = toIsoDate(dateString)
  if (!isoDate) return dateString
  
  try {
    const [ano, mes, dia] = isoDate.split('-')
    const date = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))
    
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
    
    return `${parseInt(dia)} de ${meses[parseInt(mes) - 1]} de ${ano}`
  } catch {
    return dateString
  }
}

/**
 * Normaliza o horário do resultado para o horário correto de fechamento da extração
 * 
 * @param loteriaNome Nome da loteria (ex: "PT SP", "LOOK", "LOTECE")
 * @param horarioResultado Horário que veio do resultado (ex: "20:40", "10:40")
 * @returns Horário normalizado para fechamento (ex: "20:15", "10:00") ou o horário original se não encontrar
 */
export function normalizarHorarioResultado(
  loteriaNome: string,
  horarioResultado: string
): string {
  // Validação básica
  if (!loteriaNome || !horarioResultado) {
    return horarioResultado
  }
  
  // Normalizar nome da loteria
  const nomeNormalizado = loteriaNome.toUpperCase().trim()
  
  // Normalizar horário do resultado (formato HH:MM)
  const horarioNormalizado = horarioResultado
    .replace(/[h:]/g, ':')  // Substituir "h" por ":"
    .replace(/^(\d{1,2}):(\d{2})$/, (_, h, m) => {
      return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`
    })
  
  // Converter para minutos para comparação
  const [horaResultado, minutoResultado] = horarioNormalizado.split(':').map(Number)
  
  if (isNaN(horaResultado) || isNaN(minutoResultado)) {
    return horarioResultado // Retorna original se inválido
  }
  
  const minutosResultado = horaResultado * 60 + minutoResultado
  
  // Buscar todas as extrações com esse nome
  const extracoesComMesmoNome = extracoes.filter(
    e => e.name.toUpperCase() === nomeNormalizado && e.active
  )
  
  if (extracoesComMesmoNome.length === 0) {
    return horarioResultado // Retorna original se não encontrar extração
  }
  
  let melhorMatch: { extracao: Extracao, diferenca: number } | null = null
  
  // Para cada extração, verificar se o horário do resultado corresponde ao horário real
  for (const extracao of extracoesComMesmoNome) {
    // Buscar horário real de apuração
    const horarioReal = getHorarioRealApuracao(extracao.name, extracao.time)
    
    if (horarioReal) {
      // Verificar match exato com closeTimeReal (horário quando o resultado deve estar disponível)
      const [horaFim, minutoFim] = horarioReal.closeTimeReal.split(':').map(Number)
      const minutosFim = horaFim * 60 + minutoFim
      
      // Match exato com closeTimeReal
      if (minutosResultado === minutosFim) {
        return extracao.time // Retorna horário interno normalizado
      }
      
      // Verificar se está dentro do intervalo de apuração
      const [horaInicio, minutoInicio] = horarioReal.startTimeReal.split(':').map(Number)
      const minutosInicio = horaInicio * 60 + minutoInicio
      
      if (minutosResultado >= minutosInicio && minutosResultado <= minutosFim) {
        // Calcular diferença para escolher o melhor match se houver múltiplos
        const diferenca = Math.abs(minutosResultado - minutosFim)
        if (!melhorMatch || diferenca < melhorMatch.diferenca) {
          melhorMatch = { extracao, diferenca }
        }
      }
    }
  }
  
  // Se encontrou match dentro do intervalo, retornar o melhor
  if (melhorMatch) {
    return melhorMatch.extracao.time
  }
  
  // Fallback: verificar match aproximado com horário interno (dentro de 30 minutos)
  for (const extracao of extracoesComMesmoNome) {
    const [horaExtracao, minutoExtracao] = extracao.time.split(':').map(Number)
    if (isNaN(horaExtracao) || isNaN(minutoExtracao)) continue
    
    const minutosExtracao = horaExtracao * 60 + minutoExtracao
    const diferenca = Math.abs(minutosResultado - minutosExtracao)
    
    if (diferenca <= 30) {
      return extracao.time
    }
  }
  
  // Se não encontrou match, retornar horário original
  return horarioResultado
}
