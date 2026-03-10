import { prisma } from './prisma'

/** Mínimo exigido pelo gateway Gatebox para PIX. Valores abaixo são rejeitados pela API. */
export const GATEWAY_DEPOSITO_MINIMO = 5

/**
 * Retorna o limite efetivo de depósito mínimo (o maior entre config e mínimo do gateway).
 */
export function getLimiteDepositoMinimoEfetivo(configLimite: number | null | undefined): number {
  const config = configLimite ?? 25
  return Math.max(config, GATEWAY_DEPOSITO_MINIMO)
}

export async function getConfiguracoes() {
  let config = await prisma.configuracao.findFirst()
  
  if (!config) {
    // Criar configuração padrão se não existir
    config = await prisma.configuracao.create({
      data: {
        nomePlataforma: 'Tradição do Bicho',
        numeroSuporte: '(00) 00000-0000',
        emailSuporte: 'suporte@tradicaodobicho.com',
        whatsappSuporte: '5500000000000',
        logoSite: '',
        limiteSaqueMinimo: 30,
        limiteSaqueMaximo: 10000,
        limiteDepositoMinimo: 25,
      },
    })
  }
  
  return config
}

function normalizeConfiguracoes(updates: any) {
  const data: any = {}
  if (updates.nomePlataforma !== undefined) data.nomePlataforma = updates.nomePlataforma
  if (updates.numeroSuporte !== undefined) data.numeroSuporte = updates.numeroSuporte
  if (updates.emailSuporte !== undefined) data.emailSuporte = updates.emailSuporte
  if (updates.whatsappSuporte !== undefined) data.whatsappSuporte = updates.whatsappSuporte
  if (updates.logoSite !== undefined) data.logoSite = updates.logoSite
  if (updates.limiteSaqueMinimo !== undefined) data.limiteSaqueMinimo = updates.limiteSaqueMinimo
  if (updates.limiteSaqueMaximo !== undefined) data.limiteSaqueMaximo = updates.limiteSaqueMaximo
  if (updates.limiteDepositoMinimo !== undefined) data.limiteDepositoMinimo = updates.limiteDepositoMinimo
  return data
}

export async function updateConfiguracoes(updates: any) {
  let config = await prisma.configuracao.findFirst()
  const data = normalizeConfiguracoes(updates)
  
  if (!config) {
    return await prisma.configuracao.create({
      data,
    })
  }
  
  return await prisma.configuracao.update({
    where: { id: config.id },
    data,
  })
}
