import { NextRequest, NextResponse } from 'next/server'
import { extracoes, type Extracao } from '@/data/extracoes'

export const dynamic = 'force-dynamic'

// Lista completa de 46 extrações com Close Time e Real Close Time
// Mantida em memória para permitir atualizações temporárias (será persistida no futuro)
let extracoesCache: Extracao[] = [...extracoes]

export async function GET() {
  return NextResponse.json({ extracoes: extracoesCache, total: extracoesCache.length })
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const index = extracoesCache.findIndex((e) => e.id === body.id)
    if (index === -1) {
      return NextResponse.json({ error: 'Extração não encontrada' }, { status: 404 })
    }
    extracoesCache[index] = { ...extracoesCache[index], ...body }
    return NextResponse.json({ extracao: extracoesCache[index], message: 'Extração atualizada com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar extração' }, { status: 500 })
  }
}
