import { NextRequest, NextResponse } from 'next/server'
import { listGateways, createGateway, updateGateway, deleteGateway } from '@/lib/gateways-store'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const gateways = await listGateways()
    return NextResponse.json({ gateways, total: gateways.length })
  } catch (error) {
    console.error('Erro ao listar gateways:', error)
    return NextResponse.json({ gateways: [], total: 0, error: 'Erro ao listar gateways' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const gw = await createGateway(body)
    return NextResponse.json({ gateway: gw, message: 'Gateway criado com sucesso' })
  } catch (error) {
    console.error('Erro ao criar gateway:', error)
    return NextResponse.json({ error: 'Erro ao criar gateway' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    }
    const gw = await updateGateway(Number(body.id), body)
    return NextResponse.json({ gateway: gw, message: 'Gateway atualizado com sucesso' })
  } catch (error) {
    console.error('Erro ao atualizar gateway:', error)
    return NextResponse.json({ error: 'Erro ao atualizar gateway' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = Number(searchParams.get('id') || '0')
    if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    await deleteGateway(id)
    return NextResponse.json({ message: 'Gateway deletado com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar gateway:', error)
    return NextResponse.json({ error: 'Erro ao deletar gateway' }, { status: 500 })
  }
}
