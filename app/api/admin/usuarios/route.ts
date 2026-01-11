import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

let usuarios: any[] = []

export async function GET() {
  return NextResponse.json({ usuarios, total: usuarios.length })
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const index = usuarios.findIndex((u) => u.id === body.id)
    if (index === -1) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }
    usuarios[index] = { ...usuarios[index], ...body }
    return NextResponse.json({ usuario: usuarios[index], message: 'Usuário atualizado com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar usuário' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = parseInt(searchParams.get('id') || '0')
    usuarios = usuarios.filter((u) => u.id !== id)
    return NextResponse.json({ message: 'Usuário deletado com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao deletar usuário' }, { status: 500 })
  }
}
