import { prisma } from './prisma'

/** Gera código único para promotor (6 caracteres alfanuméricos) */
export function gerarCodigoPromotor(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/** Gera código único verificando se já existe */
export async function gerarCodigoPromotorUnico(): Promise<string> {
  let tentativas = 0
  while (tentativas < 20) {
    const code = gerarCodigoPromotor()
    const existe = await prisma.usuario.findUnique({
      where: { codigoPromotor: code },
    })
    if (!existe) return code
    tentativas++
  }
  return gerarCodigoPromotor() + Date.now().toString(36).slice(-2)
}

/** Busca promotor pelo código */
export async function buscarPromotorPorCodigo(codigo: string) {
  if (!codigo || codigo.length < 4) return null
  return prisma.usuario.findUnique({
    where: {
      codigoPromotor: codigo.toUpperCase().trim(),
      isPromotor: true,
      ativo: true,
    },
    select: { id: true, nome: true },
  })
}

/** Obtém configuração de promotor (percentual do primeiro depósito) */
export async function getConfigPromotor() {
  const config = await prisma.configuracaoPromotor.findFirst({
    where: { ativo: true },
  })
  return config || { percentualPrimeiroDep: 10 }
}

/**
 * Credita bônus ao promotor quando indicado faz primeiro depósito.
 * Retorna true se creditou, false se não aplicável.
 */
export async function creditarPromotorPrimeiroDeposito(
  usuarioId: number,
  valorDeposito: number
): Promise<{ creditou: boolean; bonusPago?: number }> {
  const indicacao = await prisma.indicacao.findUnique({
    where: { indicadoId: usuarioId },
    include: { promotor: true },
  })

  if (!indicacao || indicacao.dataPrimeiroDeposito) {
    return { creditou: false }
  }

  const config = await getConfigPromotor()
  const percentual = config.percentualPrimeiroDep || 10
  const bonusPago = Math.round((valorDeposito * percentual) / 100 * 100) / 100

  if (bonusPago <= 0) return { creditou: false }

  await prisma.$transaction(async (tx) => {
    await tx.indicacao.update({
      where: { id: indicacao.id },
      data: {
        primeiroDepositoValor: valorDeposito,
        bonusPago,
        dataPrimeiroDeposito: new Date(),
      },
    })
    await tx.usuario.update({
      where: { id: indicacao.promotorId },
      data: {
        saldo: { increment: bonusPago },
        saldoSacavel: { increment: bonusPago }, // Saldo real disponível para saque
      },
    })
    await tx.transacao.create({
      data: {
        usuarioId: indicacao.promotorId,
        tipo: 'bonus_promotor',
        status: 'pago',
        valor: bonusPago,
        descricao: `Bônus de indicação (primeiro depósito do indicado R$ ${valorDeposito.toFixed(2)})`,
      },
    })
  })

  console.log(`✅ Bônus promotor: R$ ${bonusPago.toFixed(2)} creditado ao promotor ${indicacao.promotorId} (indicado ${usuarioId} primeiro depósito R$ ${valorDeposito})`)
  return { creditou: true, bonusPago }
}
