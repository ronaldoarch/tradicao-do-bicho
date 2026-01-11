import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

let saques: any[] = []
let limiteSaque = { minimo: 10, maximo: 10000 }

export async function GET() {
  return NextResponse.json({ saques, total: saques.length, limiteSaque })
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Se for atualizar limite de saque
    if (body.limiteSaque) {
      limiteSaque = { ...limiteSaque, ...body.limiteSaque }
      return NextResponse.json({ limiteSaque, message: 'Limite de saque atualizado com sucesso' })
    }
    
    // Se for atualizar saque
    const index = saques.findIndex((s) => s.id === body.id)
    if (index === -1) {
      return NextResponse.json({ error: 'Saque não encontrado' }, { status: 404 })
    }
    saques[index] = { ...saques[index], ...body }
    return NextResponse.json({ saque: saques[index], message: 'Saque atualizado com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar saque' }, { status: 500 })
  }
}
