import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

let extracoes: any[] = [
  { id: 1, name: 'Extração Principal', active: true, time: '14:00' },
  { id: 2, name: 'Extração Secundária', active: true, time: '18:00' },
]

export async function GET() {
  return NextResponse.json({ extracoes, total: extracoes.length })
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const index = extracoes.findIndex((e) => e.id === body.id)
    if (index === -1) {
      return NextResponse.json({ error: 'Extração não encontrada' }, { status: 404 })
    }
    extracoes[index] = { ...extracoes[index], ...body }
    return NextResponse.json({ extracao: extracoes[index], message: 'Extração atualizada com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar extração' }, { status: 500 })
  }
}
