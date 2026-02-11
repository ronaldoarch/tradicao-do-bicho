import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/tracking/config
 * Busca a configuração de tracking (público, para carregar pixel no frontend)
 */
export async function GET() {
  try {
    const config = await prisma.configuracaoTracking.findFirst({
      where: { ativo: true },
      select: {
        facebookPixelId: true,
        ativo: true,
      },
    })

    // Retornar apenas pixel ID e status ativo (sem token por segurança)
    return NextResponse.json({
      config: config
        ? {
            facebookPixelId: config.facebookPixelId,
            ativo: config.ativo,
          }
        : null,
    })
  } catch (error) {
    console.error('Erro ao buscar configuração de tracking:', error)
    return NextResponse.json({ config: null })
  }
}
