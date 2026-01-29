/**
 * Funções auxiliares para sistema de Bingo
 */

import { prisma } from './prisma'
import { Prisma } from '@prisma/client'

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
    // IMPORTANTE: Ignorar cartelas que já perderam ou já ganharam
    // Uma cartela que já perdeu não pode ser marcada como ganhadora em uma nova rodada
    // Uma cartela que já ganhou também não pode ganhar novamente
    if (cartela.status === 'perdida' || cartela.status === 'ganhou') {
      continue
    }
    
    // Só verificar cartelas com status "ativa"
    if (cartela.status !== 'ativa') {
      continue
    }

    const numerosCartela = cartela.numeros as unknown as CartelaNumeros
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

/**
 * Finaliza uma sala de bingo automaticamente, processando ganhadores e marcando cartelas perdidas
 * Esta função pode ser chamada internamente sem autenticação admin
 */
export async function finalizarSalaBingo(salaId: number): Promise<{
  sucesso: boolean
  resultados: Array<{
    tipo: string
    cartelasGanhadoras: number[]
    premioTotal: number
  }>
  ganhadores: {
    linha: number[]
    coluna: number[]
    diagonal: number[]
    bingo: number[]
  }
  erro?: string
}> {
  try {
    const sala = await prisma.salaBingo.findUnique({
      where: { id: salaId },
      include: { 
        cartelas: true,
      },
    })

    if (!sala) {
      return {
        sucesso: false,
        resultados: [],
        ganhadores: { linha: [], coluna: [], diagonal: [], bingo: [] },
        erro: 'Sala não encontrada',
      }
    }

    if (!sala.emAndamento) {
      return {
        sucesso: false,
        resultados: [],
        ganhadores: { linha: [], coluna: [], diagonal: [], bingo: [] },
        erro: 'Sala já está finalizada',
      }
    }

    // Verificar ganhadores reais
    const ganhadores = await verificarCartelasSala(sala.id)

    // Processar resultados e prêmios
    const resultados: Array<{
      tipo: string
      cartelasGanhadoras: number[]
      premioTotal: number
    }> = []

    // Bingo completo
    if (ganhadores.bingo.length > 0) {
      const premioPorCartela = sala.premioBingo / ganhadores.bingo.length
      for (const cartelaId of ganhadores.bingo) {
        await prisma.cartelaBingo.update({
          where: { id: cartelaId },
          data: {
            status: 'ganhou',
            premioRecebido: premioPorCartela,
          },
        })

        const cartela = sala.cartelas.find((c) => c.id === cartelaId)
        if (cartela) {
          await prisma.usuario.update({
            where: { id: cartela.usuarioId },
            data: {
              saldo: { increment: premioPorCartela },
              saldoSacavel: { increment: premioPorCartela },
            },
          })
        }
      }

      resultados.push({
        tipo: 'bingo',
        cartelasGanhadoras: ganhadores.bingo,
        premioTotal: sala.premioBingo,
      })
    }

    // Diagonal
    if (ganhadores.diagonal.length > 0 && ganhadores.bingo.length === 0) {
      const premioPorCartela = sala.premioDiagonal / ganhadores.diagonal.length
      for (const cartelaId of ganhadores.diagonal) {
        await prisma.cartelaBingo.update({
          where: { id: cartelaId },
          data: {
            status: 'ganhou',
            premioRecebido: premioPorCartela,
          },
        })

        const cartela = sala.cartelas.find((c) => c.id === cartelaId)
        if (cartela) {
          await prisma.usuario.update({
            where: { id: cartela.usuarioId },
            data: {
              saldo: { increment: premioPorCartela },
              saldoSacavel: { increment: premioPorCartela },
            },
          })
        }
      }

      resultados.push({
        tipo: 'diagonal',
        cartelasGanhadoras: ganhadores.diagonal,
        premioTotal: sala.premioDiagonal,
      })
    }

    // Coluna
    if (ganhadores.coluna.length > 0 && ganhadores.bingo.length === 0 && ganhadores.diagonal.length === 0) {
      const premioPorCartela = sala.premioColuna / ganhadores.coluna.length
      for (const cartelaId of ganhadores.coluna) {
        await prisma.cartelaBingo.update({
          where: { id: cartelaId },
          data: {
            status: 'ganhou',
            premioRecebido: premioPorCartela,
          },
        })

        const cartela = sala.cartelas.find((c) => c.id === cartelaId)
        if (cartela) {
          await prisma.usuario.update({
            where: { id: cartela.usuarioId },
            data: {
              saldo: { increment: premioPorCartela },
              saldoSacavel: { increment: premioPorCartela },
            },
          })
        }
      }

      resultados.push({
        tipo: 'coluna',
        cartelasGanhadoras: ganhadores.coluna,
        premioTotal: sala.premioColuna,
      })
    }

    // Linha
    if (ganhadores.linha.length > 0 && ganhadores.bingo.length === 0 && ganhadores.diagonal.length === 0 && ganhadores.coluna.length === 0) {
      const premioPorCartela = sala.premioLinha / ganhadores.linha.length
      for (const cartelaId of ganhadores.linha) {
        await prisma.cartelaBingo.update({
          where: { id: cartelaId },
          data: {
            status: 'ganhou',
            premioRecebido: premioPorCartela,
          },
        })

        const cartela = sala.cartelas.find((c) => c.id === cartelaId)
        if (cartela) {
          await prisma.usuario.update({
            where: { id: cartela.usuarioId },
            data: {
              saldo: { increment: premioPorCartela },
              saldoSacavel: { increment: premioPorCartela },
            },
          })
        }
      }

      resultados.push({
        tipo: 'linha',
        cartelasGanhadoras: ganhadores.linha,
        premioTotal: sala.premioLinha,
      })
    }

    // Coletar todos os IDs das cartelas ganhadoras
    const todasCartelasGanhadoras = new Set([
      ...ganhadores.bingo,
      ...ganhadores.diagonal,
      ...ganhadores.coluna,
      ...ganhadores.linha,
    ])

    // Marcar todas as cartelas não ganhadoras como "perdida"
    const cartelasPerdidas = sala.cartelas.filter(
      (cartela) => !todasCartelasGanhadoras.has(cartela.id)
    )

    if (cartelasPerdidas.length > 0) {
      await prisma.cartelaBingo.updateMany({
        where: {
          id: { in: cartelasPerdidas.map((c) => c.id) },
          status: 'ativa',
        },
        data: {
          status: 'perdida',
        },
      })
    }

    // Criar registros de resultados
    const numerosSorteados = (sala.numerosSorteados as number[] | null) ?? []
    for (const resultado of resultados) {
      await prisma.resultadoBingo.create({
        data: {
          salaId: sala.id,
          tipo: resultado.tipo,
          numerosGanhadores: numerosSorteados as Prisma.InputJsonValue,
          cartelasGanhadoras: resultado.cartelasGanhadoras as Prisma.InputJsonValue,
          premioTotal: resultado.premioTotal,
        },
      })
    }

    // Finalizar sala
    await prisma.salaBingo.update({
      where: { id: sala.id },
      data: {
        emAndamento: false,
        dataFim: new Date(),
        resultadoFinal: resultados,
      },
    })

    return {
      sucesso: true,
      resultados,
      ganhadores,
    }
  } catch (error: any) {
    console.error(`Erro ao finalizar sala ${salaId}:`, error)
    return {
      sucesso: false,
      resultados: [],
      ganhadores: { linha: [], coluna: [], diagonal: [], bingo: [] },
      erro: error.message || 'Erro ao finalizar sala',
    }
  }
}
