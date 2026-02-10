import { prisma } from './prisma'

export async function getPromocoes() {
  return await prisma.promocao.findMany({
    where: { active: true },
    orderBy: [
      { order: 'asc' },
      { createdAt: 'desc' },
    ],
  })
}

export async function getAllPromocoes() {
  return await prisma.promocao.findMany({
    orderBy: [
      { order: 'asc' },
      { createdAt: 'desc' },
    ],
  })
}

export async function updatePromocao(id: number, updates: any) {
  const { id: _id, createdAt: _created, ...rest } = updates
  const data: Record<string, unknown> = { ...rest }

  // Mapear valor conforme tipo ao editar
  if (updates.tipo === 'percentual' || updates.tipo === 'cashback') {
    data.valor = updates.percentual ?? updates.valor ?? 0
  } else if (updates.tipo === 'valor_fixo') {
    const bonusStr = updates.bonus ?? updates.valor
    data.valor = typeof bonusStr === 'string'
      ? parseFloat(bonusStr.replace(/[^\d.,]/g, '').replace(',', '.')) || 0
      : Number(bonusStr) || 0
  }

  return await prisma.promocao.update({
    where: { id },
    data: data as any,
  })
}

export async function addPromocao(promocao: any) {
  const maxOrder = await prisma.promocao.aggregate({
    _max: { order: true },
  })

  // Mapear valor conforme tipo: percentual/cashback usa percentual, valor_fixo usa bonus
  let valor = promocao.valor ?? 0
  if (promocao.tipo === 'percentual' || promocao.tipo === 'cashback') {
    valor = promocao.percentual ?? promocao.valor ?? 0
  } else if (promocao.tipo === 'valor_fixo') {
    const bonusStr = promocao.bonus || promocao.valor
    valor = typeof bonusStr === 'string'
      ? parseFloat(bonusStr.replace(/[^\d.,]/g, '').replace(',', '.')) || 0
      : Number(bonusStr) || 0
  }
  // dobro_primeiro_deposito: valor pode ser 0, o calculator calcula o dobro

  return await prisma.promocao.create({
    data: {
      tipo: promocao.tipo || 'outro',
      valor,
      titulo: promocao.titulo || promocao.title,
      descricao: promocao.descricao,
      active: promocao.active !== undefined ? promocao.active : true,
      order: promocao.order ?? (maxOrder._max.order ? maxOrder._max.order + 1 : 1),
    },
  })
}

export async function deletePromocao(id: number) {
  await prisma.promocao.delete({
    where: { id },
  })
  return true
}
