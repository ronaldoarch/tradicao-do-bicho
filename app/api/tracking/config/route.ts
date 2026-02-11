import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/tracking/config
 * Busca a configuração de tracking (público, para carregar pixel no frontend)
 */
export async function GET() {
  try {
    // Buscar configuração (mesmo se não estiver ativa, para debug)
    const config = await prisma.configuracaoTracking.findFirst({
      select: {
        facebookPixelId: true,
        ativo: true,
      },
      orderBy: {
        id: 'desc', // Pegar a mais recente
      },
    })

    console.log('📊 Configuração de tracking encontrada:', {
      temPixelId: !!config?.facebookPixelId,
      pixelId: config?.facebookPixelId ? `${config.facebookPixelId.substring(0, 5)}...` : null,
      ativo: config?.ativo,
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
