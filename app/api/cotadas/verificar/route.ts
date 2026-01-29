import { NextRequest, NextResponse } from 'next/server'
import { getCotada } from '@/lib/cotadas-store'

/**
 * POST /api/cotadas/verificar
 * Verifica se um número é cotado e retorna a cotação
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { numero, modalidade } = body
    
    if (!numero || !modalidade) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: numero, modalidade' },
        { status: 400 }
      )
    }
    
    if (modalidade !== 'MILHAR' && modalidade !== 'CENTENA') {
      return NextResponse.json(
        { error: 'Modalidade deve ser MILHAR ou CENTENA' },
        { status: 400 }
      )
    }
    
    const cotada = await getCotada(numero, modalidade)
    
    if (cotada) {
      return NextResponse.json({
        isCotada: true,
        cotacao: cotada.cotacao,
        numero: cotada.numero,
      })
    }
    
    return NextResponse.json({
      isCotada: false,
    })
  } catch (error: any) {
    console.error('Erro ao verificar cotada:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao verificar cotada' },
      { status: 500 }
    )
  }
}
