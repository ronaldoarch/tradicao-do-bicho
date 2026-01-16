/**
 * Funções auxiliares para validação de extrações
 */

import { extracoes, type Extracao } from '@/data/extracoes'
import { getHorarioRealApuracao, temSorteioNoDia } from '@/data/horarios-reais-apuracao'

/**
 * Verifica se uma extração pode ser usada hoje (baseado no campo days)
 * 
 * @param days Campo days da extração (ex: "Seg, Ter, Qua, Sex, Sáb", "Todos", "—")
 * @returns true se pode usar hoje, false caso contrário
 */
export function podeUsarHoje(days: string): boolean {
  if (!days || days === '—' || days === 'Todos') {
    return true
  }

  const hoje = new Date()
  const diaSemana = hoje.getDay() // 0=Domingo, 1=Segunda, ..., 6=Sábado

  const diasMap: Record<string, number> = {
    dom: 0,
    domingo: 0,
    seg: 1,
    segunda: 1,
    'segunda-feira': 1,
    ter: 2,
    terça: 2,
    'terça-feira': 2,
    qua: 3,
    quarta: 3,
    'quarta-feira': 3,
    qui: 4,
    quinta: 4,
    'quinta-feira': 4,
    sex: 5,
    sexta: 5,
    'sexta-feira': 5,
    sáb: 6,
    sábado: 6,
  }

  const diasLower = days.toLowerCase().trim()
  const diasArray = diasLower.split(/[,;]/).map((d) => d.trim())

  return diasArray.some((dia) => {
    const diaNum = diasMap[dia]
    return diaNum !== undefined && diaNum === diaSemana
  })
}

/**
 * Busca extração pelo ID
 */
export function buscarExtracaoPorId(extracaoId: number): Extracao | null {
  return extracoes.find((e) => e.id === extracaoId) || null
}

/**
 * Busca extração pelo nome e horário
 */
export function buscarExtracaoPorNomeEHorario(
  nomeExtracao: string,
  horario?: string | null
): Extracao | null {
  let extracao = extracoes.find((e) => {
    const nomeMatch = e.name.toLowerCase() === nomeExtracao.toLowerCase()
    if (horario) {
      return nomeMatch && (e.time === horario || e.closeTime === horario)
    }
    return nomeMatch
  })

  // Se não encontrou com horário, busca apenas por nome (pega a primeira)
  if (!extracao) {
    extracao = extracoes.find(
      (e) => e.name.toLowerCase() === nomeExtracao.toLowerCase()
    )
  }

  return extracao || null
}

/**
 * Valida se uma extração pode ser usada para criar uma aposta
 * 
 * @param extracaoId ID da extração (se loteria for numérico)
 * @param nomeLoteria Nome da loteria (se não tiver ID)
 * @param horario Horário da aposta
 * @param dataConcurso Data do concurso
 * @returns Objeto com isValid e errorMessage
 */
export function validarExtracaoParaAposta(
  extracaoId: number | null,
  nomeLoteria: string | null,
  horario: string | null,
  dataConcurso: Date | null
): { isValid: boolean; errorMessage?: string } {
  // Se não tem loteria, não precisa validar
  if (!extracaoId && !nomeLoteria) {
    return { isValid: true }
  }

  // Buscar extração
  let extracao: Extracao | null = null
  if (extracaoId) {
    extracao = buscarExtracaoPorId(extracaoId)
  } else if (nomeLoteria) {
    extracao = buscarExtracaoPorNomeEHorario(nomeLoteria, horario || undefined)
  }

  if (!extracao) {
    return {
      isValid: false,
      errorMessage: 'Extração não encontrada',
    }
  }

  // Verificar se está ativa
  if (!extracao.active) {
    return {
      isValid: false,
      errorMessage: `${extracao.name} não está ativa`,
    }
  }

  // Verificar se pode usar hoje (campo days)
  if (!podeUsarHoje(extracao.days)) {
    return {
      isValid: false,
      errorMessage: `${extracao.name} não tem sorteio hoje`,
    }
  }

  // Verificar horário real de apuração
  if (horario && horario !== 'null' && dataConcurso) {
    const horarioReal = getHorarioRealApuracao(extracao.name, horario)
    if (horarioReal) {
      const diaSemana = dataConcurso.getDay()
      if (!temSorteioNoDia(horarioReal, diaSemana)) {
        return {
          isValid: false,
          errorMessage: 'Não tem sorteio neste dia',
        }
      }
    }
  }

  return { isValid: true }
}
