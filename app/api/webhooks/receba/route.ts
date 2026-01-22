import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calcularBonus } from '@/lib/promocoes-calculator'

export const dynamic = 'force-dynamic'

/**
 * Webhook para depósitos do gateway Receba.
 * Espera um payload com pelo menos:
 * {
 *   amount: number,
 *   status: 'paid' | ...,
 *   externalId?: string,
 *   userId?: number,
 *   email?: string
 * }
 *
 * Obs: ajuste os campos conforme o payload real do Receba e faça a validação de assinatura se houver.
 */
export async function POST(req: NextRequest) {
  let webhookEventId: number | null = null
  
  try {
    const body = await req.json()
    const headersList = req.headers
    
    // Registrar o webhook recebido
    try {
      const relevantHeaders: Record<string, string> = {}
      headersList.forEach((value, key) => {
        if (key.toLowerCase().startsWith('x-') || 
            key.toLowerCase() === 'authorization' ||
            key.toLowerCase() === 'content-type') {
          relevantHeaders[key] = value
        }
      })

      const webhookEvent = await prisma.webhookEvent.create({
        data: {
          source: 'receba',
          eventType: body.status || 'unknown',
          payload: body,
          headers: relevantHeaders,
          status: 'received',
        },
      })
      webhookEventId = webhookEvent.id
    } catch (trackError) {
      console.error('Erro ao registrar webhook:', trackError)
      // Continua processando mesmo se falhar o tracking
    }
    const amount = Number(body.amount || 0)
    const status = String(body.status || '').toLowerCase()
    const externalId = body.externalId ? String(body.externalId) : undefined
    const userIdPayload = body.userId ? Number(body.userId) : undefined
    const emailPayload = body.email ? String(body.email).toLowerCase() : undefined

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 })
    }

    // Processa apenas depósitos pagos
    if (status !== 'paid' && status !== 'pago') {
      return NextResponse.json({ message: 'Ignorado: status não pago' }, { status: 200 })
    }

    // Localizar usuário
    let user = null
    if (userIdPayload) {
      user = await prisma.usuario.findUnique({ where: { id: userIdPayload } })
    }
    if (!user && emailPayload) {
      user = await prisma.usuario.findUnique({ where: { email: emailPayload } })
    }

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Verificar se já existe transação igual (idempotência simples)
    if (externalId) {
      const existing = await prisma.transacao.findFirst({
        where: { referenciaExterna: externalId, tipo: 'deposito' },
      })
      if (existing) {
        return NextResponse.json({ message: 'Transação já processada' }, { status: 200 })
      }
    }

    // Contar depósitos pagos anteriores (para bônus de primeiro depósito)
    const depositosPagos = await prisma.transacao.count({
      where: { usuarioId: user.id, tipo: 'deposito', status: 'pago' },
    })

    // Buscar promoções ativas configuradas pelo admin
    const promocoesAtivas = await prisma.promocao.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
    })

    // Calcular bônus usando sistema de promoções
    const calculoBonus = calcularBonus(amount, promocoesAtivas, depositosPagos === 0)
    let bonusAplicado = calculoBonus.bonus

    // Se não aplicou promoção mas é primeiro depósito, usar regras antigas como fallback
    if (bonusAplicado === 0 && depositosPagos === 0) {
      const bonusPercent = Number(process.env.BONUS_FIRST_DEPOSIT_PERCENT ?? 50)
      const bonusLimit = Number(process.env.BONUS_FIRST_DEPOSIT_LIMIT ?? 100)
      if (bonusPercent > 0) {
        const calc = (amount * bonusPercent) / 100
        bonusAplicado = Math.min(calc, bonusLimit)
      }
    }

    // Multiplicador de rollover (padrão: 3x o valor do bônus)
    const rolloverMult = Number(process.env.BONUS_ROLLOVER_MULTIPLIER ?? 3)

    await prisma.$transaction(async (tx) => {
      // Criar transação
      await tx.transacao.create({
        data: {
          usuarioId: user!.id,
          tipo: 'deposito',
          status: 'pago',
          valor: amount,
          bonusAplicado,
          referenciaExterna: externalId,
          descricao: 'Depósito via Receba',
        },
      })

      // Atualizar saldo e bônus/rollover
      await tx.usuario.update({
        where: { id: user!.id },
        data: {
          saldo: { increment: amount },
          bonusBloqueado: bonusAplicado > 0 ? { increment: bonusAplicado } : undefined,
          rolloverNecessario: bonusAplicado > 0 ? { increment: bonusAplicado * rolloverMult } : undefined,
        },
      })
    })

    // Atualizar status do webhook para processado
    if (webhookEventId) {
      try {
        await prisma.webhookEvent.update({
          where: { id: webhookEventId },
          data: {
            status: 'processed',
            statusCode: 200,
            response: { message: 'Depósito processado', bonusAplicado },
            processedAt: new Date(),
          },
        })
      } catch (updateError) {
        console.error('Erro ao atualizar webhook:', updateError)
      }
    }

    return NextResponse.json({
      message: 'Depósito processado',
      bonusAplicado,
    })
  } catch (error) {
    console.error('Erro no webhook Receba:', error)
    
    // Atualizar status do webhook para falhou
    if (webhookEventId) {
      try {
        await prisma.webhookEvent.update({
          where: { id: webhookEventId },
          data: {
            status: 'failed',
            statusCode: 500,
            error: String(error),
            processedAt: new Date(),
          },
        })
      } catch (updateError) {
        console.error('Erro ao atualizar webhook:', updateError)
      }
    }
    
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
