import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET() {
  try {
    await requireAdmin()
    const config = await prisma.configuracaoPromotor.findFirst({
      where: { ativo: true },
    })
    return NextResponse.json({
      config: config || {
        percentualPrimeiroDep: 10,
        ativo: true,
      },
    })
  } catch (error) {
    console.error('Erro ao buscar config promotor:', error)
    return NextResponse.json({ error: 'Erro ao buscar configuração' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json()
    const { percentualPrimeiroDep, ativo } = body

    const percentual = Math.min(100, Math.max(0, Number(percentualPrimeiroDep) || 10))

    const config = await prisma.configuracaoPromotor.findFirst()
    const data = {
      percentualPrimeiroDep: percentual,
      ativo: ativo !== false,
    }

    if (config) {
      await prisma.configuracaoPromotor.update({
        where: { id: config.id },
        data,
      })
    } else {
      await prisma.configuracaoPromotor.create({
        data,
      })
    }

    return NextResponse.json({ message: 'Configuração salva' })
  } catch (error) {
    console.error('Erro ao salvar config promotor:', error)
    return NextResponse.json({ error: 'Erro ao salvar configuração' }, { status: 500 })
  }
}
