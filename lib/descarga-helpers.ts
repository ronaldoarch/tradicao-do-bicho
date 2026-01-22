import { prisma } from './prisma'
import { extracoes } from '@/data/extracoes'

/**
 * Normaliza o valor de loteria para comparação
 * Converte ID numérico para nome da loteria se necessário
 */
export function normalizarLoteria(loteria: string | null): string {
  if (!loteria) return ''
  
  // Se já é um nome (não numérico), retorna como está
  if (!/^\d+$/.test(loteria)) {
    return loteria
  }
  
  // Se é um ID numérico, busca o nome correspondente
  const extracaoId = parseInt(loteria, 10)
  const extracao = extracoes.find((e) => e.id === extracaoId)
  
  return extracao ? extracao.name : loteria
}

/**
 * Calcula o total apostado por prêmio (sem filtro de número específico)
 */
export async function calcularTotalApostadoPorPremio(
  modalidade: string,
  premio: number,
  dataConcurso: Date | null = null
): Promise<number> {
  const where: any = {
    modalidade,
    status: 'pendente',
  }

  if (dataConcurso) {
    where.dataConcurso = {
      gte: new Date(dataConcurso.setHours(0, 0, 0, 0)),
      lt: new Date(dataConcurso.setHours(23, 59, 59, 999)),
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
    const detalhes = aposta.detalhes as any
    if (!detalhes?.betData) continue

    const betData = detalhes.betData

    // Verificar se a posição inclui o prêmio solicitado
    const positionToUse = betData.customPosition && betData.customPositionValue 
      ? betData.customPositionValue.trim() 
      : betData.position

    if (!positionToUse) continue

    let incluiPremio = false
    const cleanedPos = positionToUse.replace(/º/g, '').replace(/\s/g, '')

    if (cleanedPos === '1st' || cleanedPos === '1') {
      incluiPremio = premio === 1
    } else if (cleanedPos.includes('-')) {
      const [from, to] = cleanedPos.split('-').map(Number)
      if (!isNaN(from) && !isNaN(to)) {
        incluiPremio = premio >= from && premio <= to
      }
    } else {
      const singlePos = parseInt(cleanedPos, 10)
      if (!isNaN(singlePos) && singlePos >= 1 && singlePos <= 7) {
        incluiPremio = premio === singlePos
      }
    }

    if (incluiPremio) {
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
    // Buscar limite configurado (busca primeiro limite geral, depois específico)
    const limiteConfig = await prisma.limiteDescarga.findFirst({
      where: {
        modalidade,
        premio,
        loteria: '',
        horario: '',
        ativo: true,
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

export interface DescargaInfo {
  modalidade: string
  premio: number
  totalApostado: number
  limite: number | null
  excedente: number
  ultrapassou: boolean
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
      ...(dataConcurso && {
        dataConcurso: {
          gte: new Date(dataConcurso.setHours(0, 0, 0, 0)),
          lt: new Date(dataConcurso.setHours(23, 59, 59, 999)),
        },
      }),
    },
  })

  if (!alertaExistente) {
    await prisma.alertaDescarga.create({
      data: {
        modalidade,
        premio,
        limite,
        totalApostado,
        excedente,
        dataConcurso: dataConcurso || null,
        resolvido: false,
      },
    })
  } else {
    // Atualizar alerta existente
    await prisma.alertaDescarga.update({
      where: { id: alertaExistente.id },
      data: {
        totalApostado,
        excedente,
      },
    })
  }
}

/**
 * Busca alertas de descarga
 */
export async function buscarAlertasDescarga(resolvido: boolean = false) {
  return await prisma.alertaDescarga.findMany({
    where: {
      resolvido,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

/**
 * Resolve um alerta de descarga
 */
export async function resolverAlertaDescarga(alertaId: number, resolvidoPor: number) {
  return await prisma.alertaDescarga.update({
    where: { id: alertaId },
    data: {
      resolvido: true,
      resolvidoPor,
      resolvidoEm: new Date(),
    },
  })
}

/**
 * Busca estatísticas de descarga
 */
export async function buscarEstatisticasDescarga(
  modalidade?: string,
  premio?: number,
  dataConcurso?: Date
) {
  // Buscar todos os limites configurados
  const limites = await prisma.limiteDescarga.findMany({
    where: {
      ativo: true,
      ...(modalidade && { modalidade }),
      ...(premio && { premio }),
    },
  })

  const estatisticas: Array<{
    modalidade: string
    premio: number
    totalApostado: number
    limite: number | null
    excedente: number
    ultrapassou: boolean
  }> = []

  // Criar cópia da data para não modificar a original
  const dataInicio = dataConcurso ? new Date(dataConcurso) : null
  if (dataInicio) {
    dataInicio.setHours(0, 0, 0, 0)
  }
  const dataFim = dataConcurso ? new Date(dataConcurso) : null
  if (dataFim) {
    dataFim.setHours(23, 59, 59, 999)
  }

  for (const limite of limites) {
    const totalApostado = await calcularTotalApostadoPorPremio(
      limite.modalidade,
      limite.premio,
      dataInicio || null
    )

    const excedente = totalApostado > limite.limite ? totalApostado - limite.limite : 0
    const ultrapassou = totalApostado > limite.limite

    estatisticas.push({
      modalidade: limite.modalidade,
      premio: limite.premio,
      totalApostado,
      limite: limite.limite,
      excedente,
      ultrapassou,
    })
  }

  return estatisticas
}
