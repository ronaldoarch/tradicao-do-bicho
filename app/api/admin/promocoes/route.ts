import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

let promocoes: any[] = []

export async function GET() {
  return NextResponse.json({ promocoes, total: promocoes.length })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const newPromocao = {
      id: promocoes.length > 0 ? Math.max(...promocoes.map((p) => p.id)) + 1 : 1,
      ...body,
      active: body.active !== undefined ? body.active : true,
      createdAt: new Date().toISOString(),
    }
    promocoes.push(newPromocao)
    return NextResponse.json({ promocao: newPromocao, message: 'Promoção criada com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar promoção' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const index = promocoes.findIndex((p) => p.id === body.id)
    if (index === -1) {
      return NextResponse.json({ error: 'Promoção não encontrada' }, { status: 404 })
    }
    promocoes[index] = { ...promocoes[index], ...body }
    return NextResponse.json({ promocao: promocoes[index], message: 'Promoção atualizada com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar promoção' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = parseInt(searchParams.get('id') || '0')
    promocoes = promocoes.filter((p) => p.id !== id)
    return NextResponse.json({ message: 'Promoção deletada com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao deletar promoção' }, { status: 500 })
  }
}
