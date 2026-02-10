import { prisma } from './prisma'
import { calcularBonus } from './promocoes-calculator'
import { creditarPromotorPrimeiroDeposito } from './promotor-helpers'

/**
 * Processa um depósito que foi confirmado (pago).
 * Usado pelo webhook e pelo verificador de depósitos pendentes.
 */
export async function processarDepositoPago(transacaoId: number): Promise<{ ok: boolean; error?: string }> {
  const transacao = await prisma.transacao.findUnique({
    where: { id: transacaoId },
    include: { usuario: true },
  })

  if (!transacao) {
    return { ok: false, error: 'Transação não encontrada' }
  }

  if (transacao.tipo !== 'deposito') {
    return { ok: false, error: 'Tipo de transação inválido' }
  }

  if (transacao.status === 'pago') {
    return { ok: true } // Já processada
  }

  const user = transacao.usuario

  const depositosPagos = await prisma.transacao.count({
    where: { usuarioId: user.id, tipo: 'deposito', status: 'pago' },
  })

  const promocoesAtivas = await prisma.promocao.findMany({
    where: { active: true },
    orderBy: { order: 'asc' },
  })

  let bonusAplicado = calcularBonus(transacao.valor, promocoesAtivas, depositosPagos === 0).bonus

  if (bonusAplicado === 0 && depositosPagos === 0) {
    const bonusPercent = Number(process.env.BONUS_FIRST_DEPOSIT_PERCENT ?? 50)
    const bonusLimit = Number(process.env.BONUS_FIRST_DEPOSIT_LIMIT ?? 100)
    if (bonusPercent > 0) {
      bonusAplicado = Math.min((transacao.valor * bonusPercent) / 100, bonusLimit)
    }
  }

  const rolloverMult = Number(process.env.BONUS_ROLLOVER_MULTIPLIER ?? 3)

  await prisma.$transaction(async (tx) => {
    await tx.transacao.update({
      where: { id: transacao.id },
      data: { status: 'pago', bonusAplicado },
    })
    await tx.usuario.update({
      where: { id: user.id },
      data: {
        saldo: { increment: transacao.valor },
        saldoSacavel: { increment: transacao.valor },
        bonusBloqueado: bonusAplicado > 0 ? { increment: bonusAplicado } : undefined,
        rolloverNecessario: bonusAplicado > 0 ? { increment: bonusAplicado * rolloverMult } : undefined,
      },
    })
  })

  if (depositosPagos === 0) {
    try {
      await creditarPromotorPrimeiroDeposito(user.id, transacao.valor)
    } catch (promError) {
      console.error('Erro ao creditar promotor:', promError)
    }
  }

  console.log(`✅ Depósito ${transacao.id} processado: R$ ${transacao.valor.toFixed(2)} para usuário ${user.id}`)
  return { ok: true }
}
