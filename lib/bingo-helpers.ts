/**
 * Funções auxiliares para sistema de Bingo
 */

import { prisma } from './prisma'

export interface CartelaNumeros {
  b: number[]
  i: number[]
  n: number[]
  g: number[]
  o: number[]
}

/**
 * Gera uma cartela de bingo válida (5x5)
 * B: 1-15, I: 16-30, N: 31-45, G: 46-60, O: 61-75
 */
export function gerarCartelaBingo(): CartelaNumeros {
  const gerarNumerosColuna = (min: number, max: number, quantidade: number): number[] => {
    const numeros: number[] = []
    const disponiveis = Array.from({ length: max - min + 1 }, (_, i) => min + i)
    
    for (let i = 0; i < quantidade; i++) {
      const indice = Math.floor(Math.random() * disponiveis.length)
      numeros.push(disponiveis[indice])
      disponiveis.splice(indice, 1)
    }
    
    return numeros.sort((a, b) => a - b)
  }

  return {
    b: gerarNumerosColuna(1, 15, 5),
    i: gerarNumerosColuna(16, 30, 5),
    n: gerarNumerosColuna(31, 45, 5),
    g: gerarNumerosColuna(46, 60, 5),
    o: gerarNumerosColuna(61, 75, 5),
  }
}

/**
 * Verifica se uma cartela ganhou linha, coluna, diagonal ou bingo completo
 */
export function verificarGanhadores(
  cartela: CartelaNumeros,
  numerosSorteados: number[]
): {
  linha: boolean[]
  coluna: boolean[]
  diagonal: boolean[]
  bingo: boolean
} {
  const matriz = [
    cartela.b,
    cartela.i,
    cartela.n,
    cartela.g,
    cartela.o,
  ]

  const numerosMarcados = new Set(numerosSorteados)

  // Verificar linhas
  const linhasGanhas: boolean[] = []
  for (let i = 0; i < 5; i++) {
    const linhaCompleta = matriz[i].every((num) => numerosMarcados.has(num))
    linhasGanhas.push(linhaCompleta)
  }

  // Verificar colunas
  const colunasGanhas: boolean[] = []
  for (let j = 0; j < 5; j++) {
    const colunaCompleta = matriz.every((linha) => numerosMarcados.has(linha[j]))
    colunasGanhas.push(colunaCompleta)
  }

  // Verificar diagonais
  const diagonalPrincipal = matriz.every((linha, i) => numerosMarcados.has(linha[i]))
  const diagonalSecundaria = matriz.every((linha, i) => numerosMarcados.has(linha[4 - i]))
  const diagonaisGanhas = [diagonalPrincipal, diagonalSecundaria]

  // Verificar bingo completo (todos os números marcados)
  const todosNumeros = matriz.flat()
  const bingoCompleto = todosNumeros.every((num) => numerosMarcados.has(num))

  return {
    linha: linhasGanhas,
    coluna: colunasGanhas,
    diagonal: diagonaisGanhas,
    bingo: bingoCompleto,
  }
}

/**
 * Sorteia um número aleatório entre 1 e 75 que ainda não foi sorteado
 */
export function sortearNumero(numerosJaSorteados: number[]): number {
  const disponiveis = Array.from({ length: 75 }, (_, i) => i + 1).filter(
    (num) => !numerosJaSorteados.includes(num)
  )

  if (disponiveis.length === 0) {
    throw new Error('Todos os números já foram sorteados')
  }

  const indice = Math.floor(Math.random() * disponiveis.length)
  return disponiveis[indice]
}

/**
 * Verifica todas as cartelas de uma sala e identifica ganhadores
 */
export async function verificarCartelasSala(salaId: number): Promise<{
  linha: number[]
  coluna: number[]
  diagonal: number[]
  bingo: number[]
}> {
  const sala = await prisma.salaBingo.findUnique({
    where: { id: salaId },
    include: { cartelas: true },
  })

  if (!sala || !sala.numerosSorteados) {
    return { linha: [], coluna: [], diagonal: [], bingo: [] }
  }

  const numerosSorteados = sala.numerosSorteados as number[]
  const ganhadores = {
    linha: [] as number[],
    coluna: [] as number[],
    diagonal: [] as number[],
    bingo: [] as number[],
  }

  for (const cartela of sala.cartelas) {
    const numerosCartela = cartela.numeros as CartelaNumeros
    const resultado = verificarGanhadores(numerosCartela, numerosSorteados)

    if (resultado.bingo) {
      ganhadores.bingo.push(cartela.id)
    } else {
      if (resultado.diagonal.some((d) => d)) {
        ganhadores.diagonal.push(cartela.id)
      }
      if (resultado.coluna.some((c) => c)) {
        ganhadores.coluna.push(cartela.id)
      }
      if (resultado.linha.some((l) => l)) {
        ganhadores.linha.push(cartela.id)
      }
    }
  }

  return ganhadores
}
