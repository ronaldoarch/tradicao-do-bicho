import { NextRequest, NextResponse } from 'next/server'
import { getModalidades, updateModalidade } from '@/lib/modalidades-store'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdmin()
  } catch (error) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    const modalidades = await getModalidades()
    return NextResponse.json({ modalidades, total: modalidades.length })
  } catch (error) {
    console.error('Erro ao buscar modalidades:', error)
    return NextResponse.json({ error: 'Erro ao buscar modalidades' }, { status: 500 })
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
    const updated = await updateModalidade(body.id, body)
    if (!updated) {
      return NextResponse.json({ error: 'Modalidade não encontrada' }, { status: 404 })
    }
    return NextResponse.json({ modalidade: updated, message: 'Modalidade atualizada com sucesso' })
  } catch (error) {
    console.error('Erro ao atualizar modalidade:', error)
    return NextResponse.json({ error: 'Erro ao atualizar modalidade' }, { status: 500 })
  }
}
