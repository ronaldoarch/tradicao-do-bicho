import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

let configuracoes = {
  nomePlataforma: 'Lot Bicho',
  numeroSuporte: '(00) 00000-0000',
  emailSuporte: 'suporte@lotbicho.com',
  whatsappSuporte: '5500000000000',
}

export async function GET() {
  return NextResponse.json({ configuracoes })
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    configuracoes = { ...configuracoes, ...body }
    return NextResponse.json({ configuracoes, message: 'Configurações atualizadas com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar configurações' }, { status: 500 })
  }
}
