import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calcularBonus } from '@/lib/promocoes-calculator'

export const dynamic = 'force-dynamic'

/**
 * Webhook para depósitos PIX do gateway Gatebox.
 * Recebe notificações de status de transações PIX.
 * 
 * Nota: A Gatebox pode enviar webhooks de diferentes formas.
 * Este handler processa notificações de pagamento PIX.
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
          source: 'gatebox',
          eventType: body.status || body.eventType || 'unknown',
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

    const transactionId = body.transactionId || body.id || body.idTransaction
    const externalId = body.externalId || body.external_id
    const status = body.status || body.statusTransaction
    const amount = body.amount || body.value
    const endToEnd = body.endToEnd || body.end_to_end

    if (!transactionId && !externalId && !endToEnd) {
      console.log('Webhook sem identificador de transação:', body)
      return NextResponse.json({ error: 'Payload inválido - sem identificador de transação' }, { status: 400 })
    }

    const eventType = (body.type || body.eventType || '').toUpperCase()
    const statusLower = (status || '').toLowerCase()

    // Saque (PIX enviado): apenas eventos explícitos de payout
    const isPayoutEvent =
      eventType === 'PIX_PAY_OUT' ||
      eventType === 'PAY_OUT' ||
      eventType === 'PIX_PAYMENT_EFFECTIVE' ||
      eventType === 'PIX_EFFECTIVE' ||
      statusLower === 'paid_out'

    if (isPayoutEvent) {
      const refs = [transactionId, externalId, endToEnd].filter(Boolean) as string[]
      const saque = await prisma.saque.findFirst({
        where: {
          referenciaExterna: { in: refs },
          status: 'processando',
        },
      })
      if (saque) {
        await prisma.saque.update({
          where: { id: saque.id },
          data: { status: 'aprovado' },
        })
        if (webhookEventId) {
          try {
            await prisma.webhookEvent.update({
              where: { id: webhookEventId },
              data: { status: 'processed', statusCode: 200, response: { message: 'Saque confirmado' }, processedAt: new Date() },
            })
          } catch (_) {}
        }
        return NextResponse.json({ message: 'Saque confirmado' })
      }
      return NextResponse.json({ message: 'Saque não encontrado ou já processado' })
    }

    // Depósito (PIX recebido): PIX_PAY_IN
    const isPaidByEvent = eventType === 'PIX_PAY_IN'
    const isPaidByStatus =
      statusLower === 'paid' ||
      statusLower === 'completed' ||
      statusLower === 'pago' ||
      statusLower === 'paid_out' ||
      body.paid === true ||
      body.completed === true
    const isPaid = isPaidByEvent || isPaidByStatus

    if (!isPaid) {
      console.log(`Transação não paga (eventType: ${eventType}, status: ${status}), ignorando`)
      return NextResponse.json({ message: 'Transação não paga, ignorando' }, { status: 200 })
    }

    const transacao = await prisma.transacao.findFirst({
      where: {
        OR: [
          externalId ? { referenciaExterna: externalId } : undefined,
          transactionId ? { referenciaExterna: transactionId } : undefined,
          endToEnd ? { referenciaExterna: endToEnd } : undefined,
        ].filter(Boolean) as any[],
        tipo: 'deposito',
      },
      include: {
        usuario: true,
      },
    })

    if (!transacao) {
      console.log(`Transação não encontrada: ${transactionId || externalId || endToEnd}`)
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

      // Atualizar saldo e bônus/rollover
      await tx.usuario.update({
        where: { id: user.id },
        data: {
          saldo: { increment: transacao.valor },
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
    console.error('Erro no webhook Gatebox:', error)
    
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
