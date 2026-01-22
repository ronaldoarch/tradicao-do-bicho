/**
 * Calcula o bônus de uma promoção baseado no tipo e valor do depósito
 */

export interface Promocao {
  id: number
  tipo: string
  valor?: number // Para tipos que usam valor (percentual, etc)
  percentual?: number // Para tipos percentuais
  bonus?: string // Para valor fixo (string formatada)
  valorMinimo?: number
  valorMaximo?: number
  active: boolean
}

export interface CalculoBonus {
  bonus: number
  total: number
  promocaoAplicada: Promocao | null
}

/**
 * Calcula o bônus para um depósito baseado nas promoções ativas
 * @param valorDeposito Valor do depósito em R$
 * @param promocoesAtivas Lista de promoções ativas
 * @param isPrimeiroDeposito Se é o primeiro depósito do usuário
 * @returns Objeto com bônus calculado, total e promoção aplicada
 */
export function calcularBonus(
  valorDeposito: number,
  promocoesAtivas: Promocao[],
  isPrimeiroDeposito: boolean = false
): CalculoBonus {
  // Filtra promoções ativas e válidas para o valor do depósito
  const promocoesValidas = promocoesAtivas.filter((promo) => {
    if (!promo.active) return false

    // Verifica valor mínimo
    if (promo.valorMinimo && valorDeposito < promo.valorMinimo) {
      return false
    }

    // Verifica valor máximo (se definido e > 0)
    if (promo.valorMaximo && promo.valorMaximo > 0 && valorDeposito > promo.valorMaximo) {
      return false
    }

    // Para dobro do primeiro depósito, só aplica se for o primeiro
    if (promo.tipo === 'dobro_primeiro_deposito' && !isPrimeiroDeposito) {
      return false
    }

    return true
  })

  if (promocoesValidas.length === 0) {
    return {
      bonus: 0,
      total: valorDeposito,
      promocaoAplicada: null,
    }
  }

  // Prioriza promoção "dobro_primeiro_deposito" se disponível
  const promocaoDobro = promocoesValidas.find((p) => p.tipo === 'dobro_primeiro_deposito')
  const promocaoAplicar = promocaoDobro || promocoesValidas[0]

  let bonus = 0

  switch (promocaoAplicar.tipo) {
    case 'dobro_primeiro_deposito':
      // Bônus = valor do depósito (dobro = 2x, então bônus = 1x o depósito)
      bonus = valorDeposito
      break

    case 'percentual':
      // Bônus = percentual do depósito
      // Usa campo 'valor' como percentual ou 'percentual' se disponível
      const percentual = promocaoAplicar.percentual || promocaoAplicar.valor || 0
      bonus = (valorDeposito * percentual) / 100
      break

    case 'valor_fixo':
      // Bônus = valor fixo
      // Tenta usar campo 'bonus' (string) ou 'valor' (number)
      if (promocaoAplicar.bonus) {
        bonus = parseFloat(promocaoAplicar.bonus.replace(/[^\d.,]/g, '').replace(',', '.')) || 0
      } else {
        bonus = promocaoAplicar.valor || 0
      }
      break

    case 'cashback':
      // Cashback = percentual do depósito
      // Usa campo 'valor' como percentual ou 'percentual' se disponível
      const cashbackPercent = promocaoAplicar.percentual || promocaoAplicar.valor || 0
      bonus = (valorDeposito * cashbackPercent) / 100
      break

    default:
      bonus = 0
  }

  return {
    bonus,
    total: valorDeposito + bonus,
    promocaoAplicada: promocaoAplicar,
  }
}

/**
 * Valida se um depósito pode receber uma promoção específica
 */
export function validarPromocaoParaDeposito(
  valorDeposito: number,
  promocao: Promocao,
  isPrimeiroDeposito: boolean
): boolean {
  if (!promocao.active) return false

  // Verifica valor mínimo
  if (promocao.valorMinimo && valorDeposito < promocao.valorMinimo) {
    return false
  }

  // Verifica valor máximo
  if (promocao.valorMaximo && promocao.valorMaximo > 0 && valorDeposito > promocao.valorMaximo) {
    return false
  }

  // Para dobro do primeiro depósito, só aplica se for o primeiro
  if (promocao.tipo === 'dobro_primeiro_deposito' && !isPrimeiroDeposito) {
    return false
  }

  return true
}
