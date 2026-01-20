import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/bingo/salas
 * Lista todas as salas de bingo
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
  } catch (error) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const ativa = searchParams.get('ativa')
    const emAndamento = searchParams.get('emAndamento')

    const where: any = {}
    if (ativa !== null) {
      where.ativa = ativa === 'true'
    }
    if (emAndamento !== null) {
      where.emAndamento = emAndamento === 'true'
    }

    const salas = await prisma.salaBingo.findMany({
      where,
      include: {
        _count: {
          select: {
            cartelas: true,
            resultados: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ salas })
  } catch (error) {
    console.error('Erro ao buscar salas de bingo:', error)
    return NextResponse.json({ error: 'Erro ao carregar salas' }, { status: 500 })
  }
}

/**
 * POST /api/admin/bingo/salas
 * Cria uma nova sala de bingo
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
  } catch (error) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const {
      nome,
      descricao,
      valorCartela,
      premioTotal,
      premioLinha,
      premioColuna,
      premioDiagonal,
      premioBingo,
      ativa,
      sorteioAutomatico,
      intervaloSorteio,
    } = body

    if (!nome || valorCartela === undefined) {
      return NextResponse.json(
        { error: 'Nome e valor da cartela são obrigatórios' },
        { status: 400 }
      )
    }

    const agora = new Date()
    const proximoSorteio = sorteioAutomatico && intervaloSorteio
      ? new Date(agora.getTime() + Number(intervaloSorteio) * 1000)
      : null

    const sala = await prisma.salaBingo.create({
      data: {
        nome,
        descricao: descricao || null,
        valorCartela: Number(valorCartela),
        premioTotal: premioTotal ? Number(premioTotal) : 0,
        premioLinha: premioLinha ? Number(premioLinha) : 0,
        premioColuna: premioColuna ? Number(premioColuna) : 0,
        premioDiagonal: premioDiagonal ? Number(premioDiagonal) : 0,
        premioBingo: premioBingo ? Number(premioBingo) : 0,
        ativa: ativa !== undefined ? Boolean(ativa) : true,
        emAndamento: false,
        sorteioAutomatico: sorteioAutomatico !== undefined ? Boolean(sorteioAutomatico) : false,
        intervaloSorteio: intervaloSorteio ? Number(intervaloSorteio) : 30,
        proximoSorteio: proximoSorteio || null,
      } as any,
    })

    return NextResponse.json({ sala })
  } catch (error) {
    console.error('Erro ao criar sala de bingo:', error)
    return NextResponse.json({ error: 'Erro ao criar sala' }, { status: 500 })
  }
}

/**
 * PUT /api/admin/bingo/salas
 * Atualiza uma sala de bingo
 */
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin()
  } catch (error) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    }

    const updateData: any = {
      ...(data.nome && { nome: data.nome }),
      ...(data.descricao !== undefined && { descricao: data.descricao }),
      ...(data.valorCartela !== undefined && { valorCartela: Number(data.valorCartela) }),
      ...(data.premioTotal !== undefined && { premioTotal: Number(data.premioTotal) }),
      ...(data.premioLinha !== undefined && { premioLinha: Number(data.premioLinha) }),
      ...(data.premioColuna !== undefined && { premioColuna: Number(data.premioColuna) }),
      ...(data.premioDiagonal !== undefined && { premioDiagonal: Number(data.premioDiagonal) }),
      ...(data.premioBingo !== undefined && { premioBingo: Number(data.premioBingo) }),
      ...(data.ativa !== undefined && { ativa: Boolean(data.ativa) }),
      ...(data.emAndamento !== undefined && { emAndamento: Boolean(data.emAndamento) }),
    }

    // Atualizar configurações de sorteio automático
    if (data.sorteioAutomatico !== undefined) {
      updateData.sorteioAutomatico = Boolean(data.sorteioAutomatico)
      
      // Se está ativando sorteio automático e a sala está em andamento, calcular próximo sorteio
      if (data.sorteioAutomatico && data.emAndamento !== false) {
        const intervaloSorteio = data.intervaloSorteio ? Number(data.intervaloSorteio) : 30
        updateData.proximoSorteio = new Date(Date.now() + intervaloSorteio * 1000)
      } else if (!data.sorteioAutomatico) {
        updateData.proximoSorteio = null
      }
    }

    if (data.intervaloSorteio !== undefined) {
      updateData.intervaloSorteio = Number(data.intervaloSorteio)
    }

    const sala = await prisma.salaBingo.update({
      where: { id: Number(id) },
      data: updateData,
    })

    return NextResponse.json({ sala })
  } catch (error) {
    console.error('Erro ao atualizar sala de bingo:', error)
    return NextResponse.json({ error: 'Erro ao atualizar sala' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/bingo/salas
 * Remove uma sala de bingo
 */
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin()
  } catch (error) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    }

    await prisma.salaBingo.delete({
      where: { id: parseInt(id, 10) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar sala de bingo:', error)
    return NextResponse.json({ error: 'Erro ao deletar sala' }, { status: 500 })
  }
}
