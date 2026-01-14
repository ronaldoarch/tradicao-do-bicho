import { prisma } from './prisma'

export async function getConfiguracoes() {
  let config = await prisma.configuracao.findFirst()
  
  if (!config) {
    // Criar configuração padrão se não existir
    config = await prisma.configuracao.create({
      data: {
        nomePlataforma: 'Lot Bicho',
        numeroSuporte: '(00) 00000-0000',
        emailSuporte: 'suporte@tradicaodobicho.com',
        whatsappSuporte: '5500000000000',
        logoSite: '',
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
