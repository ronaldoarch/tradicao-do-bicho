import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { gerarCodigoPromotorUnico } from '@/lib/promotor-helpers'

/** POST - Ativa ou desativa promotor em um usuário */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json()
    const { usuarioId, isPromotor } = body

    if (!usuarioId) {
      return NextResponse.json({ error: 'usuarioId obrigatório' }, { status: 400 })
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: Number(usuarioId) },
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    if (isPromotor) {
      let codigo = usuario.codigoPromotor
      if (!codigo) {
        codigo = await gerarCodigoPromotorUnico()
      }
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { isPromotor: true, codigoPromotor: codigo },
      })
      return NextResponse.json({
        message: 'Usuário definido como promotor',
        codigoPromotor: codigo,
      })
    } else {
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { isPromotor: false }, // mantém codigoPromotor para histórico
      })
      return NextResponse.json({ message: 'Promotor desativado' })
    }
  } catch (error) {
    console.error('Erro ao toggle promotor:', error)
    return NextResponse.json({ error: 'Erro ao atualizar promotor' }, { status: 500 })
  }
}
