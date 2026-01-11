import { NextRequest, NextResponse } from 'next/server'
import { ANIMALS } from '@/data/animals'

export const dynamic = 'force-dynamic'

// Inicializa cotações padrão para cada grupo (1:18 significa 1 real paga 18)
const getDefaultQuotations = () => {
  const quotations: Record<number, number> = {}
  ANIMALS.forEach((animal) => {
    quotations[animal.group] = 18 // Valor padrão 1:18
  })
  return quotations
}

let extracoes: any[] = [
  { 
    id: 1, 
    name: 'Extração Principal', 
    active: true, 
    time: '14:00',
    quotations: getDefaultQuotations()
  },
  { 
    id: 2, 
    name: 'Extração Secundária', 
    active: true, 
    time: '18:00',
    quotations: getDefaultQuotations()
  },
]

export async function GET() {
  return NextResponse.json({ extracoes, total: extracoes.length })
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const index = extracoes.findIndex((e) => e.id === body.id)
    if (index === -1) {
      return NextResponse.json({ error: 'Extração não encontrada' }, { status: 404 })
    }
    
    // Se estiver atualizando cotações
    if (body.quotations) {
      extracoes[index].quotations = { ...extracoes[index].quotations, ...body.quotations }
    } else {
      extracoes[index] = { ...extracoes[index], ...body }
    }
    
    return NextResponse.json({ extracao: extracoes[index], message: 'Extração atualizada com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar extração' }, { status: 500 })
  }
}
