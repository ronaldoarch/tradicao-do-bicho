import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/admin-auth'
import { getCotadas, saveCotada, deleteCotada, activateCotada } from '@/lib/cotadas-store'

/**
 * GET /api/admin/cotadas
 * Lista todas as cotadas
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdminAPI(request)
    
    const { searchParams } = new URL(request.url)
    const modalidade = searchParams.get('modalidade') as 'MILHAR' | 'CENTENA' | null
    
    const cotadas = await getCotadas(modalidade || undefined)
    
    return NextResponse.json({ cotadas })
  } catch (error: any) {
    console.error('Erro ao listar cotadas:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao listar cotadas' },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/admin/cotadas
 * Cria ou atualiza uma cotada
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdminAPI(request)
    
    const body = await request.json()
    const { numero, modalidade, cotacao, ativo } = body
    
    if (!numero || !modalidade || cotacao === undefined) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: numero, modalidade, cotacao' },
        { status: 400 }
      )
    }
    
    if (modalidade !== 'MILHAR' && modalidade !== 'CENTENA') {
      return NextResponse.json(
        { error: 'Modalidade deve ser MILHAR ou CENTENA' },
        { status: 400 }
      )
    }
    
    const cotada = await saveCotada({
      numero,
      modalidade,
      cotacao: Number(cotacao),
      ativo: ativo !== undefined ? Boolean(ativo) : true,
    })
    
    return NextResponse.json({ cotada })
  } catch (error: any) {
    console.error('Erro ao salvar cotada:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao salvar cotada' },
      { status: error.status || 500 }
    )
  }
}

/**
 * DELETE /api/admin/cotadas?id=123
 * Desativa uma cotada
 */
export async function DELETE(request: NextRequest) {
  try {
    await requireAdminAPI(request)
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID é obrigatório' },
        { status: 400 }
      )
    }
    
    await deleteCotada(Number(id))
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao deletar cotada:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao deletar cotada' },
      { status: error.status || 500 }
    )
  }
}

/**
 * PATCH /api/admin/cotadas?id=123&action=activate
 * Ativa ou desativa uma cotada
 */
export async function PATCH(request: NextRequest) {
  try {
    await requireAdminAPI(request)
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const action = searchParams.get('action')
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID é obrigatório' },
        { status: 400 }
      )
    }
    
    if (action === 'activate') {
      await activateCotada(Number(id))
    } else if (action === 'deactivate') {
      await deleteCotada(Number(id))
    } else {
      return NextResponse.json(
        { error: 'Action deve ser "activate" ou "deactivate"' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao atualizar cotada:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar cotada' },
      { status: error.status || 500 }
    )
  }
}
