import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

let stories: any[] = []

export async function GET() {
  return NextResponse.json({ stories, total: stories.length })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const newStory = {
      id: stories.length > 0 ? Math.max(...stories.map((s) => s.id)) + 1 : 1,
      ...body,
      active: body.active !== undefined ? body.active : true,
      createdAt: new Date().toISOString(),
    }
    stories.push(newStory)
    return NextResponse.json({ story: newStory, message: 'Story criado com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar story' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const index = stories.findIndex((s) => s.id === body.id)
    if (index === -1) {
      return NextResponse.json({ error: 'Story não encontrado' }, { status: 404 })
    }
    stories[index] = { ...stories[index], ...body }
    return NextResponse.json({ story: stories[index], message: 'Story atualizado com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar story' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = parseInt(searchParams.get('id') || '0')
    stories = stories.filter((s) => s.id !== id)
    return NextResponse.json({ message: 'Story deletado com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao deletar story' }, { status: 500 })
  }
}
