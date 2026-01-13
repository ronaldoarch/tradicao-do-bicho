/**
 * Regras de cálculo para modalidades de número e grupo.
 *
 * Terminologia:
 * - combinações_do_palpite: quantas permutações distintas do número (invertida) ou 1 (normal/grupo).
 * - posições: pos_to - pos_from + 1.
 * - unidades = combinações_do_palpite × posições.
 * - valor_unitário = valor_palpite / unidades.
 * - prêmio_unidade = odd_modalidade × valor_unitário (somar todas as unidades vencedoras).
 */

export type DivisionType = 'all' | 'each'

export type ModalityKey =
  | 'MILHAR'
  | 'MILHAR_INVERTIDA'
  | 'CENTENA'
  | 'CENTENA_INVERTIDA'
  | 'DEZENA'
  | 'DEZENA_INVERTIDA'
  | 'GRUPO'
  | 'DUPLA_GRUPO'
  | 'TERNO_GRUPO'
  | 'QUADRA_GRUPO'

export interface PositionRange {
  pos_from: number
  pos_to: number
}

export interface BetValueResult {
  combinations: number
  positions: number
  units: number
  unitValue: number
}

// Limites de posição por modalidade
export const LIMITES_POSICOES: Record<ModalityKey, [number, number]> = {
  MILHAR: [1, 5],
  MILHAR_INVERTIDA: [1, 5],
  CENTENA: [1, 7],
  CENTENA_INVERTIDA: [1, 7],
  DEZENA: [1, 7],
  DEZENA_INVERTIDA: [1, 7],
  GRUPO: [1, 7],
  DUPLA_GRUPO: [1, 7],
  TERNO_GRUPO: [1, 7],
  QUADRA_GRUPO: [1, 7],
}

export function validarPosicoes(modalidade: ModalityKey, pos_from: number, pos_to: number) {
  const [min, max] = LIMITES_POSICOES[modalidade]
  if (!(min <= pos_from && pos_from <= pos_to && pos_to <= max)) {
    throw new Error('Intervalo de posições inválido para essa modalidade')
  }
}

/** Conta permutações distintas de um número (string). */
export function combinacoesInvertida(numero: string): number {
  const digits = numero.split('')
  const seen = new Set<string>()
  permuteDistinct(digits, 0, seen)
  return seen.size
}

function permuteDistinct(arr: string[], start: number, acc: Set<string>) {
  if (start === arr.length) {
    acc.add(arr.join(''))
    return
  }
  const used = new Set<string>()
  for (let i = start; i < arr.length; i++) {
    if (used.has(arr[i])) continue
    used.add(arr[i])
    swap(arr, start, i)
    permuteDistinct(arr, start + 1, acc)
    swap(arr, start, i)
  }
}

function swap(arr: string[], i: number, j: number) {
  const tmp = arr[i]
  arr[i] = arr[j]
  arr[j] = tmp
}

/** Número de combinações para modalidades invertidas, conforme quantidade de dígitos. */
export function combinacoesInvertidaNumero(numero: string): number {
  return combinacoesInvertida(numero)
}

/** Unidades e valor unitário para modalidades de número (normal ou invertida). */
export function calcularNumero(
  modalidade: ModalityKey,
  numero: string,
  pos_from: number,
  pos_to: number,
  valor_palpite: number
): BetValueResult {
  validarPosicoes(modalidade, pos_from, pos_to)
  const positions = pos_to - pos_from + 1
  const invertida = modalidade.endsWith('INVERTIDA')
  const combinations = invertida ? combinacoesInvertidaNumero(numero) : 1
  const units = combinations * positions
  const unitValue = units > 0 ? valor_palpite / units : 0
  return { combinations, positions, units, unitValue }
}

/** Unidades e valor para modalidades de grupo (simples, dupla, terno, quadra). */
export function calcularGrupo(
  modalidade: ModalityKey,
  qtdGruposPalpite: number,
  pos_from: number,
  pos_to: number,
  valor_palpite: number
): BetValueResult {
  validarPosicoes(modalidade, pos_from, pos_to)
  const positions = pos_to - pos_from + 1
  const expectedGroups = getExpectedGroups(modalidade)
  if (expectedGroups !== qtdGruposPalpite) {
    throw new Error(`Quantidade de grupos inválida: esperado ${expectedGroups}, recebido ${qtdGruposPalpite}`)
  }
  const combinations = 1 // simples (não combinado)
  const units = combinations * positions
  const unitValue = units > 0 ? valor_palpite / units : 0
  return { combinations, positions, units, unitValue }
}

function getExpectedGroups(modalidade: ModalityKey): number {
  switch (modalidade) {
    case 'GRUPO':
      return 1
    case 'DUPLA_GRUPO':
      return 2
    case 'TERNO_GRUPO':
      return 3
    case 'QUADRA_GRUPO':
      return 4
    default:
      return 0
  }
}

/** Rateio por palpite conforme divisão */
export function dividirValorPalpite(total: number, qtd_palpites: number, divisionType: DivisionType): number {
  if (qtd_palpites <= 0) throw new Error('qtd_palpites deve ser > 0')
  if (divisionType === 'all') return total / qtd_palpites
  return total // 'each' => valor informado já é por palpite
}
