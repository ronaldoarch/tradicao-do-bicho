import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

let extracoes: any[] = [
  { id: 1, name: 'FEDERAL 20h', active: true, time: '20:00' },
  { id: 2, name: 'BANDEIRANTES 16h', active: true, time: '16:00' },
  { id: 3, name: 'LBR 15h', active: true, time: '15:00' },
  { id: 4, name: 'PONTO-TARDE 15h', active: true, time: '15:00' },
  { id: 5, name: 'PTV-RIO 16h20', active: true, time: '16:20' },
  { id: 6, name: 'LOOK 16h20', active: true, time: '16:20' },
  { id: 7, name: 'SALVAÇÃO 13h40', active: true, time: '13:40' },
  { id: 8, name: 'LOTERIA FEDERAL 21h', active: true, time: '21:00' },
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
