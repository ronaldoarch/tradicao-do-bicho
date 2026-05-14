import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveGateway, getGatewayConfig } from '@/lib/gateways-store'
import { gateboxGetStatus } from '@/lib/gatebox-client'
import {
  selectbankingFindDepositStatusByExternalId,
  selectbankingGetDepositByHash,
  type SelectBankingConfig,
} from '@/lib/selectbanking-client'

/** Extrai hash `dep_…` gravado na descrição ao criar o PIX (`id=dep_xxx`). */
function parseDepositHashFromDescricao(descricao: string | null | undefined): string | null {
  if (!descricao) return null
  const m = descricao.match(/\bid=(dep_[^\s]+)/i)
  return m?.[1] ?? null
}
import { processarDepositoPago } from '@/lib/deposito-processor'

export const dynamic = 'force-dynamic'

const PAID_SELECTBANKING = [
  'paid',
  'pago',
  'completed',
  'complete',
  'approved',
  'success',
  'succeeded',
  'settled',
  'confirmed',
  'transferred',
  'paid_out',
]

/**
 * GET /api/cron/verificar-depositos-pendentes
 *
 * Fallback quando o webhook não é recebido (Gatebox ou SelectBanking).
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
    if (!gateway) {
      return NextResponse.json({ message: 'Nenhum gateway ativo', processados: 0 })
    }

    if (gateway.type !== 'gatebox' && gateway.type !== 'selectbanking') {
      return NextResponse.json({
        message: 'Cron de polling não aplicável ao gateway ativo (use Gatebox ou SelectBanking)',
        processados: 0,
      })
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

    if (gateway.type === 'gatebox') {
      const gateboxConfig = await getGatewayConfig(gateway)
      if (!gateboxConfig || gateboxConfig.type !== 'gatebox') {
        return NextResponse.json({ message: 'Config Gatebox inválida', processados: 0 })
      }

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

          const data = statusRes as Record<string, unknown>
          const status = String(data?.status ?? (data?.data as Record<string, unknown>)?.status ?? '').toLowerCase()

          if (['paid', 'completed', 'pago', 'paid_out'].includes(status)) {
            const result = await processarDepositoPago(t.id)
            if (result.ok) processados++
          }
        } catch (err) {
          console.error(`Erro ao verificar depósito ${t.id}:`, err)
        }
      }
    } else {
      const raw = await getGatewayConfig(gateway)
      if (!raw || raw.type !== 'selectbanking') {
        return NextResponse.json({ message: 'Config SelectBanking inválida', processados: 0 })
      }
      const sbConfig: SelectBankingConfig = {
        baseUrl: raw.baseUrl,
        token: raw.token,
      }

      for (const t of pendentes) {
        const externalId = t.referenciaExterna
        if (!externalId) continue
        try {
          const hashFromDesc = parseDepositHashFromDescricao(t.descricao)
          let st = ''
          if (hashFromDesc) {
            const byHash = await selectbankingGetDepositByHash(sbConfig, hashFromDesc)
            st = (byHash?.status || '').toLowerCase()
          }
          if (!st) {
            const info = await selectbankingFindDepositStatusByExternalId(sbConfig, externalId)
            st = (info?.status || '').toLowerCase()
          }
          if (st && PAID_SELECTBANKING.includes(st)) {
            const result = await processarDepositoPago(t.id)
            if (result.ok) processados++
          }
        } catch (err) {
          console.error(`Erro ao verificar depósito SelectBanking ${t.id}:`, err)
        }
      }
    }

    return NextResponse.json({
      message: 'Verificação concluída',
      pendentes: pendentes.length,
      processados,
    })
  } catch (error) {
    console.error('Erro ao verificar depósitos pendentes:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
