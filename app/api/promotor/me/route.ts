import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { parseSessionToken } from '@/lib/auth'

/** GET - Dados do promotor logado (link, estatísticas) */
export async function GET() {
  try {
    const session = cookies().get('lotbicho_session')?.value
    const payload = parseSessionToken(session)
    if (!payload?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.id },
      select: {
        isPromotor: true,
        codigoPromotor: true,
        nome: true,
      },
    })

    if (!usuario || !usuario.isPromotor || !usuario.codigoPromotor) {
      return NextResponse.json({
        isPromotor: false,
        message: 'Você não é promotor. Entre em contato com o suporte.',
      })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3001'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tradicaodobicho.site'
    const linkCompleto = `${appUrl.replace(/\/$/, '')}/cadastro?ref=${usuario.codigoPromotor}`

    const stats = await prisma.indicacao.findMany({
      where: { promotorId: payload.id },
      include: {
        indicado: {
          select: { nome: true, email: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const indicadosComDeposito = stats.filter((s) => s.dataPrimeiroDeposito)
    const bonusTotal = stats.reduce((acc, s) => acc + (s.bonusPago || 0), 0)

    return NextResponse.json({
      isPromotor: true,
      codigoPromotor: usuario.codigoPromotor,
      linkCompleto,
      totalIndicados: stats.length,
      indicadosComDeposito: indicadosComDeposito.length,
      bonusTotal,
      indicacoes: stats.map((s) => ({
        indicado: s.indicado.nome,
        email: s.indicado.email,
        dataCadastro: s.createdAt,
        primeiroDeposito: s.primeiroDepositoValor,
        bonusPago: s.bonusPago,
        dataPrimeiroDeposito: s.dataPrimeiroDeposito,
      })),
    })
  } catch (error) {
    console.error('Erro ao buscar dados promotor:', error)
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
  }
}
