import { prisma } from './prisma'

export interface GatewayInput {
  id?: number
  name: string
  baseUrl: string
  apiKey: string
  sandbox?: boolean
  active?: boolean
}

export async function listGateways() {
  return prisma.gateway.findMany({
    orderBy: { id: 'desc' },
  })
}

export async function createGateway(input: GatewayInput) {
  return prisma.gateway.create({
    data: {
      name: input.name,
      baseUrl: input.baseUrl,
      apiKey: input.apiKey,
      sandbox: input.sandbox ?? true,
      active: input.active ?? true,
    },
  })
}

export async function updateGateway(id: number, input: Partial<GatewayInput>) {
  return prisma.gateway.update({
    where: { id },
    data: {
      name: input.name,
      baseUrl: input.baseUrl,
      apiKey: input.apiKey,
      sandbox: input.sandbox,
      active: input.active,
    },
  })
}

export async function deleteGateway(id: number) {
  return prisma.gateway.delete({ where: { id } })
}
