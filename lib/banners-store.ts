import { prisma } from './prisma'

export async function getBanners() {
  return await prisma.banner.findMany({
    where: { active: true },
    orderBy: { order: 'asc' },
  })
}

export async function getAllBanners() {
  return await prisma.banner.findMany({
    orderBy: { order: 'asc' },
  })
}

function normalizeBannerInput(banner: any, nextOrder?: number) {
  const data: any = {}
  if (banner.title !== undefined) data.title = banner.title
  if (banner.text !== undefined) data.text = banner.text
  if (banner.bonus !== undefined) data.bonus = banner.bonus
  if (banner.logoImage !== undefined) data.logoImage = banner.logoImage
  if (banner.bannerImage !== undefined) data.bannerImage = banner.bannerImage
  if (banner.active !== undefined) data.active = !!banner.active
  if (banner.order !== undefined) data.order = Number(banner.order)
  if (data.order === undefined || Number.isNaN(data.order)) {
    data.order = nextOrder ?? 1
  }
  return data
}

export async function updateBanner(id: number, updates: any) {
  const data = normalizeBannerInput(updates)
  return await prisma.banner.update({
    where: { id },
    data,
  })
}

export async function addBanner(banner: any) {
  const maxOrder = await prisma.banner.aggregate({
    _max: { order: true },
  })
  const nextOrder = maxOrder._max.order ? maxOrder._max.order + 1 : 1
  const data = normalizeBannerInput(banner, nextOrder)
  return await prisma.banner.create({
    data: {
      ...data,
      active: data.active !== undefined ? data.active : true,
      order: data.order ?? nextOrder,
    },
  })
}

export async function deleteBanner(id: number) {
  await prisma.banner.delete({
    where: { id },
  })
  return true
}
