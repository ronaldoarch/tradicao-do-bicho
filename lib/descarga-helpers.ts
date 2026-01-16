/**
 * Funções auxiliares para sistema de descarga/controle de banca
 * 
 * IMPORTANTE: O sistema NÃO bloqueia apostas quando limites são ultrapassados.
 * Apenas gera alertas para o administrador tomar ações de descarga.
 */

import { prisma } from './prisma'
import { parsePosition } from './position-parser'

export interface DescargaInfo {
  modalidade: string
  premio: number
  totalApostado: number
  limite: number | null
  excedente: number
  ultrapassou: boolean
}

/**
 * Calcula o total apostado por modalidade e prêmio para um concurso específico
 */
export async function calcularTotalApostadoPorPremio(
  modalidade: string,
  premio: number,
  dataConcurso: Date | null = null
): Promise<number> {
  const where: any = {
    modalidade,
    status: {
      in: ['pendente', 'liquidado'], // Só conta apostas pendentes ou liquidadas
    },
  }

  // Se dataConcurso fornecida, filtrar por ela
  if (dataConcurso) {
    const inicioDia = new Date(dataConcurso)
    inicioDia.setHours(0, 0, 0, 0)
    const fimDia = new Date(dataConcurso)
    fimDia.setHours(23, 59, 59, 999)

    where.dataConcurso = {
      gte: inicioDia,
      lte: fimDia,
    }
  }

  const apostas = await prisma.aposta.findMany({
    where,
    select: {
      valor: true,
      detalhes: true,
    },
  })

  let total = 0

  for (const aposta of apostas) {
    // Verificar se a aposta cobre este prêmio específico
    if (aposta.detalhes && typeof aposta.detalhes === 'object' && 'betData' in aposta.detalhes) {
      const betData = (aposta.detalhes as any).betData
      const position = betData.position || betData.customPositionValue

      if (position) {
        const { pos_from, pos_to } = parsePosition(position)
        // Se o prêmio está dentro do intervalo da aposta
        if (premio >= pos_from && premio <= pos_to) {
          total += aposta.valor
        }
      } else {
      // Se não tem posição definida, assume que cobre todos os prêmios
        total += aposta.valor
      }
    } else {
      // Se não tem detalhes, assume que cobre todos os prêmios
      total += aposta.valor
    }
  }

  return total
}

/**
 * Verifica se uma aposta ultrapassa os limites de descarga
 */
export async function verificarLimiteDescarga(
  modalidade: string,
  premios: number[], // Array de prêmios que a aposta cobre (ex: [1, 2, 3] para 1º ao 3º)
  valorAposta: number,
  dataConcurso: Date | null = null
): Promise<DescargaInfo[]> {
  const resultados: DescargaInfo[] = []

  for (const premio of premios) {
    // Buscar limite configurado
    const limiteConfig = await prisma.limiteDescarga.findUnique({
      where: {
        modalidade_premio: {
          modalidade,
          premio,
        },
      },
    })

    if (!limiteConfig || !limiteConfig.ativo) {
      // Sem limite configurado ou inativo, não verifica
      resultados.push({
        modalidade,
        premio,
        totalApostado: 0,
        limite: null,
        excedente: 0,
        ultrapassou: false,
      })
      continue
    }

    // Calcular total já apostado
    const totalApostado = await calcularTotalApostadoPorPremio(modalidade, premio, dataConcurso)

    // Total após esta aposta
    const totalAposAposta = totalApostado + valorAposta

    // Verificar se ultrapassou
    const ultrapassou = totalAposAposta > limiteConfig.limite
    const excedente = ultrapassou ? totalAposAposta - limiteConfig.limite : 0

    resultados.push({
      modalidade,
      premio,
      totalApostado: totalApostado,
      limite: limiteConfig.limite,
      excedente,
      ultrapassou,
    })

    // Se ultrapassou, criar alerta
    if (ultrapassou) {
      await criarAlertaDescarga(modalidade, premio, limiteConfig.limite, totalAposAposta, excedente, dataConcurso)
    }
  }

  return resultados
}

/**
 * Cria um alerta de descarga quando limite é ultrapassado
 */
async function criarAlertaDescarga(
  modalidade: string,
  premio: number,
  limite: number,
  totalApostado: number,
  excedente: number,
  dataConcurso: Date | null = null
): Promise<void> {
  // Verificar se já existe alerta não resolvido para esta combinação
  const alertaExistente = await prisma.alertaDescarga.findFirst({
    where: {
      modalidade,
      premio,
      resolvido: false,
      dataConcurso: dataConcurso || null,
    },
  })

  if (alertaExistente) {
    // Atualizar alerta existente
    await prisma.alertaDescarga.update({
      where: { id: alertaExistente.id },
      data: {
        totalApostado,
        excedente,
        updatedAt: new Date(),
      },
    })
  } else {
    // Criar novo alerta
    await prisma.alertaDescarga.create({
      data: {
        modalidade,
        premio,
        limite,
        totalApostado,
        excedente,
        dataConcurso,
        resolvido: false,
      },
    })
  }
}

/**
 * Busca todos os alertas de descarga não resolvidos
 */
export async function buscarAlertasDescarga(resolvido: boolean = false) {
  return prisma.alertaDescarga.findMany({
    where: {
      resolvido,
    },
    orderBy: [
      { excedente: 'desc' },
      { createdAt: 'desc' },
    ],
  })
}

/**
 * Resolve um alerta de descarga
 */
export async function resolverAlertaDescarga(alertaId: number, adminId: number): Promise<void> {
  await prisma.alertaDescarga.update({
    where: { id: alertaId },
    data: {
      resolvido: true,
      resolvidoEm: new Date(),
      resolvidoPor: adminId,
    },
  })
}

/**
 * Busca estatísticas de descarga por modalidade e prêmio
 */
export async function buscarEstatisticasDescarga(
  modalidade?: string,
  premio?: number,
  dataConcurso?: Date
): Promise<Array<{
  modalidade: string
  premio: number
  totalApostado: number
  limite: number | null
  excedente: number
  ultrapassou: boolean
}>> {
  const limites = await prisma.limiteDescarga.findMany({
    where: {
      ativo: true,
      ...(modalidade && { modalidade }),
      ...(premio && { premio }),
    },
  })

  const resultados = []

  for (const limite of limites) {
    const totalApostado = await calcularTotalApostadoPorPremio(
      limite.modalidade,
      limite.premio,
      dataConcurso || null
    )

    const ultrapassou = totalApostado > limite.limite
    const excedente = ultrapassou ? totalApostado - limite.limite : 0

    resultados.push({
      modalidade: limite.modalidade,
      premio: limite.premio,
      totalApostado,
      limite: limite.limite,
      excedente,
      ultrapassou,
    })
  }

  return resultados.sort((a, b) => {
    if (a.ultrapassou !== b.ultrapassou) {
      return a.ultrapassou ? -1 : 1
    }
    return b.excedente - a.excedente
  })
}
