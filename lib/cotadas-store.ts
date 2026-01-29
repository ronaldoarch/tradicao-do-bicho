/**
 * Store para gerenciar números cotados
 */

import { prisma } from '@/lib/prisma'

export interface CotadaInput {
  numero: string
  modalidade: 'MILHAR' | 'CENTENA'
  cotacao: number
  ativo?: boolean
}

export interface Cotada {
  id: number
  numero: string
  modalidade: string
  cotacao: number
  ativo: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Busca todas as cotadas ativas
 */
export async function getCotadas(modalidade?: 'MILHAR' | 'CENTENA'): Promise<Cotada[]> {
  const where: any = { ativo: true }
  if (modalidade) {
    where.modalidade = modalidade
  }
  
  return await prisma.cotada.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Busca uma cotada específica por número e modalidade
 */
export async function getCotada(numero: string, modalidade: 'MILHAR' | 'CENTENA'): Promise<Cotada | null> {
  const numeroLimpo = numero.replace(/\D/g, '').padStart(modalidade === 'MILHAR' ? 4 : 3, '0')
  
  return await prisma.cotada.findFirst({
    where: {
      numero: numeroLimpo,
      modalidade,
      ativo: true,
    },
  })
}

/**
 * Verifica se um número é cotado
 */
export async function isCotada(numero: string, modalidade: 'MILHAR' | 'CENTENA'): Promise<boolean> {
  const cotada = await getCotada(numero, modalidade)
  return cotada !== null
}

/**
 * Cria ou atualiza uma cotada
 */
export async function saveCotada(input: CotadaInput): Promise<Cotada> {
  const numeroLimpo = input.numero.replace(/\D/g, '').padStart(input.modalidade === 'MILHAR' ? 4 : 3, '0')
  
  return await prisma.cotada.upsert({
    where: {
      numero_modalidade: {
        numero: numeroLimpo,
        modalidade: input.modalidade,
      },
    },
    update: {
      cotacao: input.cotacao,
      ativo: input.ativo !== undefined ? input.ativo : true,
      updatedAt: new Date(),
    },
    create: {
      numero: numeroLimpo,
      modalidade: input.modalidade,
      cotacao: input.cotacao,
      ativo: input.ativo !== undefined ? input.ativo : true,
    },
  })
}

/**
 * Remove uma cotada (desativa)
 */
export async function deleteCotada(id: number): Promise<void> {
  await prisma.cotada.update({
    where: { id },
    data: { ativo: false },
  })
}

/**
 * Ativa uma cotada
 */
export async function activateCotada(id: number): Promise<void> {
  await prisma.cotada.update({
    where: { id },
    data: { ativo: true },
  })
}
