import { prisma } from '../lib/prisma'

/**
 * Script para liberar manualmente o bônus bloqueado de um usuário
 * Transfere bonusBloqueado → bonus e zera o rollover
 *
 * Uso: npx tsx scripts/liberar-bonus.ts <userId>
 *      npx tsx scripts/liberar-bonus.ts --nome "Sérgio Ricardo"
 *
 * Exemplo: npx tsx scripts/liberar-bonus.ts 123
 */
async function liberarBonus() {
  const arg1 = process.argv[2]
  const arg2 = process.argv[3]

  if (!arg1) {
    console.error('❌ Uso: npx tsx scripts/liberar-bonus.ts <userId>')
    console.error('   ou: npx tsx scripts/liberar-bonus.ts --nome "Nome do usuário"')
    process.exit(1)
  }

  let usuario: { id: number; nome: string; email: string; bonus: number; bonusBloqueado: number; rolloverAtual: number; rolloverNecessario: number } | null

  if (arg1 === '--nome' && arg2) {
    // Buscar por nome (parcial)
    usuario = await prisma.usuario.findFirst({
      where: { nome: { contains: arg2, mode: 'insensitive' } },
      select: {
        id: true,
        nome: true,
        email: true,
        bonus: true,
        bonusBloqueado: true,
        rolloverAtual: true,
        rolloverNecessario: true,
      },
    })
  } else {
    const userId = parseInt(arg1)
    if (!userId || isNaN(userId)) {
      console.error('❌ ID do usuário inválido')
      process.exit(1)
    }
    usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nome: true,
        email: true,
        bonus: true,
        bonusBloqueado: true,
        rolloverAtual: true,
        rolloverNecessario: true,
      },
    })
  }

  if (!usuario) {
    console.error('❌ Usuário não encontrado')
    process.exit(1)
  }

  if (usuario.bonusBloqueado <= 0) {
    console.log(`ℹ️  Usuário ${usuario.nome} (ID ${usuario.id}) não possui bônus bloqueado.`)
    process.exit(0)
  }

  console.log(`📋 Usuário encontrado:`)
  console.log(`   ID: ${usuario.id}`)
  console.log(`   Nome: ${usuario.nome}`)
  console.log(`   Email: ${usuario.email}`)
  console.log(`   Bônus atual: R$ ${usuario.bonus.toFixed(2)}`)
  console.log(`   Bônus bloqueado: R$ ${usuario.bonusBloqueado.toFixed(2)}`)
  console.log(`   Rollover: ${usuario.rolloverAtual.toFixed(2)} / ${usuario.rolloverNecessario.toFixed(2)}`)

  try {
    const valorLiberado = usuario.bonusBloqueado

    const updated = await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        bonus: { increment: valorLiberado },
        bonusBloqueado: 0,
        rolloverNecessario: 0,
        rolloverAtual: 0,
      },
      select: { bonus: true, bonusBloqueado: true },
    })

    console.log(`\n✅ Bônus liberado com sucesso!`)
    console.log(`   Valor liberado: R$ ${valorLiberado.toFixed(2)}`)
    console.log(`   Novo bônus disponível: R$ ${updated.bonus.toFixed(2)}`)
  } catch (error) {
    console.error('❌ Erro ao liberar bônus:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

liberarBonus()
