import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveGateway, getGatewayConfig } from '@/lib/gateways-store'
import { gateboxGetStatus } from '@/lib/gatebox-client'
import { processarDepositoPago } from '@/lib/deposito-processor'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/verificar-depositos-pendentes
 *
 * Verifica depósitos pendentes (Gatebox) e processa se pagos.
 * Fallback quando o webhook não é recebido.
 *
 * Chamar via cron a cada 1-2 minutos: curl "https://seu-site.com/api/cron/verificar-depositos-pendentes?secret=SEU_SECRET"
 */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  const cronSecret = process.env.CRON_SECRET || process.env.CRON_VERIFY_SECRET

  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json({ error: 'Não autorizado. Defina CRON_SECRET e passe ?secret=valor' }, { status: 401 })
  }

  try {
    const gateway = await getActiveGateway()
    if (!gateway || gateway.type !== 'gatebox') {
      return NextResponse.json({ message: 'Gatebox não configurado ou inativo', processados: 0 })
    }

    const gateboxConfig = await getGatewayConfig(gateway)
    if (!gateboxConfig || gateboxConfig.type !== 'gatebox') {
      return NextResponse.json({ message: 'Config Gatebox inválida', processados: 0 })
    }

    const pendentes = await prisma.transacao.findMany({
      where: {
        tipo: 'deposito',
        status: 'pendente',
        referenciaExterna: { not: null },
        gatewayId: gateway.id,
      },
      take: 20,
    })

    let processados = 0

    for (const t of pendentes) {
      const externalId = t.referenciaExterna
      if (!externalId) continue

      try {
        const statusRes = await gateboxGetStatus(
          {
            username: gateboxConfig.username!,
            password: gateboxConfig.password!,
            baseUrl: gateboxConfig.baseUrl,
          },
          { externalId }
        )

        const data = statusRes as any
        const status = (data?.status ?? data?.data?.status ?? '').toLowerCase()

        if (['paid', 'completed', 'pago', 'paid_out'].includes(status)) {
          const result = await processarDepositoPago(t.id)
          if (result.ok) processados++
        }
      } catch (err) {
        console.error(`Erro ao verificar depósito ${t.id}:`, err)
      }
    }

    return NextResponse.json({
      message: 'Verificação concluída',
      pendentes: pendentes.length,
      processados,
    })
  } catch (error) {
    console.error('Erro ao verificar depósitos pendentes:', error)
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    )
  }
}
