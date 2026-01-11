import { NextRequest, NextResponse } from 'next/server'
import { MODALITIES as MODALITIES_DATA } from '@/data/modalities'

export const dynamic = 'force-dynamic'

let modalidades = [...MODALITIES_DATA]

export async function GET() {
  return NextResponse.json({ modalidades, total: modalidades.length })
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const index = modalidades.findIndex((m) => m.id === body.id)
    if (index === -1) {
      return NextResponse.json({ error: 'Modalidade não encontrada' }, { status: 404 })
    }
    modalidades[index] = { ...modalidades[index], ...body }
    return NextResponse.json({ modalidade: modalidades[index], message: 'Modalidade atualizada com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar modalidade' }, { status: 500 })
  }
}
