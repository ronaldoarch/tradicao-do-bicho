/**
 * Funções para parsear e validar posições de apostas
 */

export interface ParsedPosition {
  pos_from: number
  pos_to: number
}

/**
 * Parseia uma string de posição para pos_from e pos_to
 * 
 * Exemplos:
 * - "1st" ou "1" -> { pos_from: 1, pos_to: 1 }
 * - "1-5" -> { pos_from: 1, pos_to: 5 }
 * - "7" -> { pos_from: 7, pos_to: 7 }
 * - "1-7" -> { pos_from: 1, pos_to: 7 }
 * 
 * @param position String da posição
 * @returns Objeto com pos_from e pos_to
 */
export function parsePosition(position: string | null | undefined): ParsedPosition {
  const defaultPos: ParsedPosition = { pos_from: 1, pos_to: 1 }

  if (!position) {
    return defaultPos
  }

  // Remove "º" e espaços, normaliza formato
  const cleanedPos = position.replace(/º/g, '').replace(/\s/g, '')

  if (cleanedPos === '1st' || cleanedPos === '1') {
    return { pos_from: 1, pos_to: 1 }
  }

  if (cleanedPos.includes('-')) {
    const [from, to] = cleanedPos.split('-').map(Number)
    return {
      pos_from: from || 1,
      pos_to: to || 1,
    }
  }

  // Posição única (ex: "7")
  const num = parseInt(cleanedPos, 10)
  if (!Number.isNaN(num) && num >= 1 && num <= 7) {
    return { pos_from: num, pos_to: num }
  }

  return defaultPos
}

/**
 * Valida se uma posição é válida para uma modalidade específica
 * 
 * @param position Posição a validar
 * @param modalityName Nome da modalidade
 * @returns true se válida, false caso contrário
 */
export function validarPosicaoParaModalidade(
  position: string | null,
  modalityName?: string | null
): boolean {
  if (!position) {
    return false
  }

  const { pos_from, pos_to } = parsePosition(position)

  // Validação básica: posições devem estar entre 1 e 7
  if (pos_from < 1 || pos_from > 7 || pos_to < 1 || pos_to > 7) {
    return false
  }

  if (pos_from > pos_to) {
    return false
  }

  // Validações específicas por modalidade podem ser adicionadas aqui
  // Por exemplo, algumas modalidades podem não aceitar todas as posições

  return true
}

/**
 * Formata uma posição para exibição
 * 
 * @param pos_from Posição inicial
 * @param pos_to Posição final
 * @returns String formatada (ex: "1º", "1º ao 5º", "7º")
 */
export function formatarPosicao(pos_from: number, pos_to: number): string {
  if (pos_from === pos_to) {
    return `${pos_from}º`
  }
  return `${pos_from}º ao ${pos_to}º`
}
