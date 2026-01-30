import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Limites de saque (sem tabela no schema; pode ser movido para config/DB depois)
let limiteSaque = { minimo: 10, maximo: 10000 }

function formatSaqueForAdmin(saque: {
  id: number
  usuarioId: number
  valor: number
  status: string
  motivo: string | null
  createdAt: Date
  usuario: { nome: string; email: string }
}) {
  return {
    id: saque.id,
    usuario: `${saque.usuario.nome} (${saque.usuario.email})`,
    valor: saque.valor,
    status: saque.status as 'pendente' | 'processando' | 'aprovado' | 'rejeitado',
    data: new Date(saque.createdAt).toLocaleString('pt-BR'),
  }
}

/**
 * GET /api/admin/saques
 * Lista todos os saques do banco (para admin)
 */
export async function GET() {
  try {
    const saquesDb = await prisma.saque.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        usuario: { select: { nome: true, email: true } },
      },
    })
    const saques = saquesDb.map(formatSaqueForAdmin)
    return NextResponse.json({ saques, total: saques.length, limiteSaque })
  } catch (error) {
    console.error('Erro ao listar saques (admin):', error)
    return NextResponse.json(
      { error: 'Erro ao listar saques' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/saques
 * Atualiza limite de saque ou status de um saque (aprovar/rejeitar)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    if (body.limiteSaque) {
      limiteSaque = { ...limiteSaque, ...body.limiteSaque }
      return NextResponse.json({
        limiteSaque,
        message: 'Limite de saque atualizado com sucesso',
      })
    }

    const { id, status, motivo } = body
    if (id == null || !status) {
      return NextResponse.json(
        { error: 'id e status são obrigatórios' },
        { status: 400 }
      )
    }

    const saque = await prisma.saque.findUnique({
      where: { id: Number(id) },
      include: { usuario: true },
    })
    if (!saque) {
      return NextResponse.json({ error: 'Saque não encontrado' }, { status: 404 })
    }
    if (saque.status !== 'pendente') {
      return NextResponse.json(
        { error: 'Saque já foi processado' },
        { status: 400 }
      )
    }

    if (status === 'rejeitado') {
      await prisma.$transaction([
        prisma.usuario.update({
          where: { id: saque.usuarioId },
          data: {
            saldo: { increment: saque.valor },
            saldoSacavel: { increment: saque.valor },
          },
        }),
        prisma.saque.update({
          where: { id: saque.id },
          data: { status: 'rejeitado', motivo: motivo ?? null },
        }),
      ])
    } else if (status === 'aprovado') {
      await prisma.saque.update({
        where: { id: saque.id },
        data: { status: 'aprovado', motivo: motivo ?? null },
      })
      // TODO: disparar PIX de saque via gateway (Gatebox/SuitPay) quando existir integração
    } else {
      return NextResponse.json(
        { error: 'Status inválido. Use aprovado ou rejeitado' },
        { status: 400 }
      )
    }

    const updated = await prisma.saque.findUnique({
      where: { id: saque.id },
      include: { usuario: { select: { nome: true, email: true } } },
    })
    return NextResponse.json({
      saque: updated ? formatSaqueForAdmin(updated) : null,
      message:
        status === 'rejeitado'
          ? 'Saque rejeitado e valor devolvido ao saldo'
          : 'Saque atualizado com sucesso',
    })
  } catch (error) {
    console.error('Erro ao atualizar saque (admin):', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar saque' },
      { status: 500 }
    )
  }
}
