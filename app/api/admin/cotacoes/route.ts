import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

let cotacoes: any[] = []

export async function GET() {
  return NextResponse.json({ cotacoes, total: cotacoes.length })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const newCotacao = {
      id: cotacoes.length > 0 ? Math.max(...cotacoes.map((c) => c.id)) + 1 : 1,
      ...body,
      active: body.active !== undefined ? body.active : true,
      createdAt: new Date().toISOString(),
    }
    cotacoes.push(newCotacao)
    return NextResponse.json({ cotacao: newCotacao, message: 'Cotação criada com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar cotação' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const index = cotacoes.findIndex((c) => c.id === body.id)
    if (index === -1) {
      return NextResponse.json({ error: 'Cotação não encontrada' }, { status: 404 })
    }
    cotacoes[index] = { ...cotacoes[index], ...body }
    return NextResponse.json({ cotacao: cotacoes[index], message: 'Cotação atualizada com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar cotação' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = parseInt(searchParams.get('id') || '0')
    cotacoes = cotacoes.filter((c) => c.id !== id)
    return NextResponse.json({ message: 'Cotação deletada com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao deletar cotação' }, { status: 500 })
  }
}
