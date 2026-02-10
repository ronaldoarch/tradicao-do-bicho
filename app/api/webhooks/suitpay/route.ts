import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validarHashWebhookSuitPay, type SuitPayWebhookPixPayload } from '@/lib/suitpay-client'
import { calcularBonus } from '@/lib/promocoes-calculator'
import { creditarPromotorPrimeiroDeposito } from '@/lib/promotor-helpers'

export const dynamic = 'force-dynamic'

/**
 * Webhook para depósitos PIX do gateway SuitPay.
 * Recebe notificações de status de transações PIX.
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
          source: 'suitpay',
          eventType: body.statusTransaction || 'unknown',
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

    // Validar payload do webhook
    const payload: SuitPayWebhookPixPayload = body

    if (!payload.idTransaction || !payload.statusTransaction) {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }

    // Validar hash do webhook
    const clientSecret = process.env.SUITPAY_CLIENT_SECRET
    if (!clientSecret) {
      console.error('SUITPAY_CLIENT_SECRET não configurado')
      return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 500 })
    }

    const { hash, ...payloadSemHash } = payload
    const hashValido = validarHashWebhookSuitPay(payloadSemHash, hash, clientSecret)

    if (!hashValido) {
      console.error('Hash do webhook inválido')
      return NextResponse.json({ error: 'Hash inválido' }, { status: 401 })
    }

    // Processar apenas transações pagas (PAID_OUT)
    if (payload.statusTransaction !== 'PAID_OUT') {
      return NextResponse.json({ message: 'Transação não paga, ignorando' }, { status: 200 })
    }

    // Buscar transação pelo requestNumber ou idTransaction
    const transacao = await prisma.transacao.findFirst({
      where: {
        OR: [
          { referenciaExterna: payload.idTransaction },
          { referenciaExterna: payload.requestNumber },
        ],
        tipo: 'deposito',
      },
      include: {
        usuario: true,
      },
    })

    if (!transacao) {
      console.log(`Transação não encontrada: ${payload.idTransaction}`)
      return NextResponse.json({ message: 'Transação não encontrada' }, { status: 200 })
    }

    // Verificar se já foi processada
    if (transacao.status === 'pago') {
      return NextResponse.json({ message: 'Transação já processada' }, { status: 200 })
    }

    // Buscar usuário
    const user = transacao.usuario

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
    const calculoBonus = calcularBonus(transacao.valor, promocoesAtivas, depositosPagos === 0)
    let bonusAplicado = calculoBonus.bonus

    // Se não aplicou promoção mas é primeiro depósito, usar regras antigas como fallback
    if (bonusAplicado === 0 && depositosPagos === 0) {
      const bonusPercent = Number(process.env.BONUS_FIRST_DEPOSIT_PERCENT ?? 50)
      const bonusLimit = Number(process.env.BONUS_FIRST_DEPOSIT_LIMIT ?? 100)
      if (bonusPercent > 0) {
        const calc = (transacao.valor * bonusPercent) / 100
        bonusAplicado = Math.min(calc, bonusLimit)
      }
    }

    // Multiplicador de rollover (padrão: 3x o valor do bônus)
    const rolloverMult = Number(process.env.BONUS_ROLLOVER_MULTIPLIER ?? 3)

    await prisma.$transaction(async (tx) => {
      // Atualizar transação
      await tx.transacao.update({
        where: { id: transacao.id },
        data: {
          status: 'pago',
          bonusAplicado,
        },
      })

      // Atualizar saldo, saldoSacavel (dinheiro real para saque) e bônus/rollover
      await tx.usuario.update({
        where: { id: user.id },
        data: {
          saldo: { increment: transacao.valor },
          saldoSacavel: { increment: transacao.valor }, // Depósito é dinheiro real, pode sacar
          bonusBloqueado: bonusAplicado > 0 ? { increment: bonusAplicado } : undefined,
          rolloverNecessario: bonusAplicado > 0 ? { increment: bonusAplicado * rolloverMult } : undefined,
        },
      })
    })

    // Bônus promotor: primeiro depósito de indicado
    if (depositosPagos === 0) {
      try {
        await creditarPromotorPrimeiroDeposito(user.id, transacao.valor)
      } catch (promError) {
        console.error('Erro ao creditar promotor:', promError)
      }
    }

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
    console.error('Erro no webhook SuitPay:', error)
    
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
