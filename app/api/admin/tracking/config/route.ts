import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/tracking/config
 * Busca a configuração de tracking
 */
export async function GET(request: NextRequest) {
  const adminCheck = await requireAdminAPI(request)
  if (adminCheck instanceof NextResponse) {
    return adminCheck
  }

  try {
    let config = await prisma.configuracaoTracking.findFirst()

    // Se não existe, cria uma configuração padrão
    if (!config) {
      config = await prisma.configuracaoTracking.create({
        data: {
          facebookPixelId: null,
          facebookAccessToken: null,
          webhookUrl: null,
          ativo: true,
        },
      })
    }

    return NextResponse.json({ config })
  } catch (error) {
    console.error('Erro ao buscar configuração de tracking:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar configuração' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/tracking/config
 * Atualiza a configuração de tracking
 */
export async function POST(request: NextRequest) {
  const adminCheck = await requireAdminAPI(request)
  if (adminCheck instanceof NextResponse) {
    return adminCheck
  }

  try {
    const body = await request.json()
    const { facebookPixelId, facebookAccessToken, webhookUrl, ativo } = body

    // Buscar ou criar configuração
    let config = await prisma.configuracaoTracking.findFirst()

    if (config) {
      config = await prisma.configuracaoTracking.update({
        where: { id: config.id },
        data: {
          facebookPixelId: facebookPixelId !== undefined ? facebookPixelId : config.facebookPixelId,
          facebookAccessToken: facebookAccessToken !== undefined ? facebookAccessToken : config.facebookAccessToken,
          webhookUrl: webhookUrl !== undefined ? webhookUrl : config.webhookUrl,
          ativo: ativo !== undefined ? Boolean(ativo) : config.ativo,
        },
      })
    } else {
      config = await prisma.configuracaoTracking.create({
        data: {
          facebookPixelId: facebookPixelId || null,
          facebookAccessToken: facebookAccessToken || null,
          webhookUrl: webhookUrl || null,
          ativo: ativo !== undefined ? Boolean(ativo) : true,
        },
      })
    }

    return NextResponse.json({
      message: 'Configuração salva com sucesso',
      config,
    })
  } catch (error) {
    console.error('Erro ao salvar configuração de tracking:', error)
    return NextResponse.json(
      { error: 'Erro ao salvar configuração' },
      { status: 500 }
    )
  }
}
