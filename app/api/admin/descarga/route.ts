import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/admin-auth'
import { definirLimiteDescarga } from '@/lib/descarga'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/descarga
 * Lista todos os limites de descarga
 */
export async function GET(request: NextRequest) {
  // Verificar se é admin
  const adminCheck = await requireAdminAPI(request)
  if (adminCheck instanceof NextResponse) {
    return adminCheck
  }

  try {
    const limites = await prisma.limiteDescarga.findMany({
      orderBy: [
        { modalidade: 'asc' },
        { premio: 'asc' },
      ],
    })

    const numerosBloqueados = await prisma.numeroBloqueado.findMany({
      orderBy: [
        { bloqueadoEm: 'desc' },
      ],
    })

    return NextResponse.json({ limites, numerosBloqueados })
  } catch (error) {
    console.error('Erro ao buscar limites:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar limites' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/descarga
 * Define ou atualiza um limite de descarga
 */
export async function POST(request: NextRequest) {
  // Verificar se é admin
  const adminCheck = await requireAdminAPI(request)
  if (adminCheck instanceof NextResponse) {
    return adminCheck
  }

  try {
    const body = await request.json()
    const { modalidade, premio, limite, loteria } = body

    if (!modalidade || !premio || limite === undefined) {
      return NextResponse.json(
        { error: 'Modalidade, prêmio e limite são obrigatórios' },
        { status: 400 }
      )
    }

    const limiteCriado = await definirLimiteDescarga({
      modalidade,
      premio: Number(premio),
      limite: Number(limite),
      loteria: loteria || '',
    })

    return NextResponse.json({
      message: 'Limite definido com sucesso',
      limite: limiteCriado,
    })
  } catch (error: any) {
    console.error('Erro ao definir limite:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao definir limite' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/descarga
 * Remove um limite de descarga ou desbloqueia um número
 */
export async function DELETE(request: NextRequest) {
  // Verificar se é admin
  const adminCheck = await requireAdminAPI(request)
  if (adminCheck instanceof NextResponse) {
    return adminCheck
  }

  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo') // 'limite' ou 'numero'
    const id = searchParams.get('id')

    if (!tipo || !id) {
      return NextResponse.json(
        { error: 'Tipo e ID são obrigatórios' },
        { status: 400 }
      )
    }

    if (tipo === 'limite') {
      await prisma.limiteDescarga.update({
        where: { id: Number(id) },
        data: { ativo: false },
      })
      return NextResponse.json({ message: 'Limite desativado com sucesso' })
    } else if (tipo === 'numero') {
      await prisma.numeroBloqueado.delete({
        where: { id: Number(id) },
      })
      return NextResponse.json({ message: 'Número desbloqueado com sucesso' })
    } else {
      return NextResponse.json(
        { error: 'Tipo inválido' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Erro ao remover:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao remover' },
      { status: 500 }
    )
  }
}
