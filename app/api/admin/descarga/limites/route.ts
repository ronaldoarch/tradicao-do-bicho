import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { parseSessionToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/descarga/limites
 * Lista todos os limites de descarga configurados
 */
export async function GET() {
  const session = cookies().get('lotbicho_session')?.value
  const user = parseSessionToken(session)

  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    const limites = await prisma.limiteDescarga.findMany({
      orderBy: [
        { modalidade: 'asc' },
        { premio: 'asc' },
      ],
    })

    return NextResponse.json({ limites })
  } catch (error) {
    console.error('Erro ao buscar limites de descarga:', error)
    return NextResponse.json({ error: 'Erro ao carregar limites' }, { status: 500 })
  }
}

/**
 * POST /api/admin/descarga/limites
 * Cria ou atualiza um limite de descarga
 */
export async function POST(request: NextRequest) {
  const session = cookies().get('lotbicho_session')?.value
  const user = parseSessionToken(session)

  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { modalidade, premio, limite, ativo } = body

    if (!modalidade || !premio || limite === undefined) {
      return NextResponse.json(
        { error: 'Modalidade, prêmio e limite são obrigatórios' },
        { status: 400 }
      )
    }

    if (premio < 1 || premio > 5) {
      return NextResponse.json(
        { error: 'Prêmio deve ser entre 1 e 5' },
        { status: 400 }
      )
    }

    if (limite < 0) {
      return NextResponse.json(
        { error: 'Limite deve ser maior ou igual a zero' },
        { status: 400 }
      )
    }

    const limiteCriado = await prisma.limiteDescarga.upsert({
      where: {
        modalidade_premio_loteria_horario: {
          modalidade,
          premio,
          loteria: '', // Limite geral
          horario: '',
        },
      },
      update: {
        limite: Number(limite),
        ativo: ativo !== undefined ? Boolean(ativo) : true,
      },
      create: {
        modalidade,
        premio,
        limite: Number(limite),
        loteria: '', // Limite geral
        horario: '',
        ativo: ativo !== undefined ? Boolean(ativo) : true,
      },
    })

    return NextResponse.json({ limite: limiteCriado })
  } catch (error) {
    console.error('Erro ao salvar limite de descarga:', error)
    return NextResponse.json({ error: 'Erro ao salvar limite' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/descarga/limites
 * Remove um limite de descarga
 */
export async function DELETE(request: NextRequest) {
  const session = cookies().get('lotbicho_session')?.value
  const user = parseSessionToken(session)

  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    }

    await prisma.limiteDescarga.delete({
      where: { id: parseInt(id, 10) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar limite de descarga:', error)
    return NextResponse.json({ error: 'Erro ao deletar limite' }, { status: 500 })
  }
}
