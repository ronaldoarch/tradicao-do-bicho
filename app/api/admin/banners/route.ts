import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Simulação de banco de dados (em produção, usar banco real)
let banners = [
  {
    id: 1,
    title: 'Seu Primeiro Depósito Vale O DOBRO!',
    badge: 'NOVO POR AQUI?',
    highlight: 'DOBRO!',
    button: 'Deposite agora e aproveite!',
    bonus: 'R$ 50',
    bonusBgClass: 'bg-green-600',
    active: true,
    order: 1,
  },
  {
    id: 2,
    title: 'Ganhe Até R$ 1 MILHÃO!',
    badge: 'PROMOÇÃO ESPECIAL',
    highlight: 'R$ 1 MILHÃO!',
    button: 'Aposte agora!',
    bonus: 'R$ 100',
    bonusBgClass: 'bg-blue-600',
    active: true,
    order: 2,
  },
  {
    id: 3,
    title: 'Bônus de 100%!',
    badge: 'BÔNUS EXCLUSIVO',
    highlight: '100%!',
    button: 'Confira as condições!',
    bonus: 'R$ 200',
    bonusBgClass: 'bg-purple-600',
    active: true,
    order: 3,
  },
]

export async function GET() {
  return NextResponse.json({ banners: banners.sort((a, b) => a.order - b.order) })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const newBanner = {
      id: banners.length > 0 ? Math.max(...banners.map((b) => b.id)) + 1 : 1,
      ...body,
      active: body.active !== undefined ? body.active : true,
      order: body.order || banners.length + 1,
    }
    banners.push(newBanner)
    return NextResponse.json({ banner: newBanner, message: 'Banner criado com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar banner' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const index = banners.findIndex((b) => b.id === body.id)
    if (index === -1) {
      return NextResponse.json({ error: 'Banner não encontrado' }, { status: 404 })
    }
    banners[index] = { ...banners[index], ...body }
    return NextResponse.json({ banner: banners[index], message: 'Banner atualizado com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar banner' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = parseInt(searchParams.get('id') || '0')
    banners = banners.filter((b) => b.id !== id)
    return NextResponse.json({ message: 'Banner deletado com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao deletar banner' }, { status: 500 })
  }
}
