import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdmin()
  } catch (error) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    const cotacoes = await prisma.cotacao.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ cotacoes, total: cotacoes.length })
  } catch (error) {
    console.error('Erro ao buscar cotações:', error)
    return NextResponse.json({ error: 'Erro ao buscar cotações' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
  } catch (error) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const newCotacao = await prisma.cotacao.create({
      data: {
        name: body.name || body.grupo || '',
        value: body.value || body.valor || '',
        active: body.active !== undefined ? body.active : true,
      },
    })
    return NextResponse.json({ cotacao: newCotacao, message: 'Cotação criada com sucesso' })
  } catch (error) {
    console.error('Erro ao criar cotação:', error)
    return NextResponse.json({ error: 'Erro ao criar cotação' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin()
  } catch (error) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const updated = await prisma.cotacao.update({
      where: { id: body.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.value !== undefined && { value: body.value }),
        ...(body.active !== undefined && { active: body.active }),
      },
    })
    return NextResponse.json({ cotacao: updated, message: 'Cotação atualizada com sucesso' })
  } catch (error) {
    console.error('Erro ao atualizar cotação:', error)
    return NextResponse.json({ error: 'Cotação não encontrada' }, { status: 404 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin()
  } catch (error) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = parseInt(searchParams.get('id') || '0')
    await prisma.cotacao.delete({
      where: { id },
    })
    return NextResponse.json({ message: 'Cotação deletada com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar cotação:', error)
    return NextResponse.json({ error: 'Erro ao deletar cotação' }, { status: 500 })
  }
}
