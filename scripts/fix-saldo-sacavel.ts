import { prisma } from '../lib/prisma'

/**
 * Corrige saldoSacavel para usuários afetados pelo bug (saldoSacavel < saldo).
 * Isso restaura o valor disponível para saque quando depósitos foram "absorvidos" pelo déficit.
 *
 * Uso: npx tsx scripts/fix-saldo-sacavel.ts
 */
async function fixSaldoSacavel() {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: {
        saldo: { gt: 0 },
        OR: [
          { saldoSacavel: { lt: 0 } },
          { saldoSacavel: { lt: prisma.usuario.fields.saldo } },
        ],
      },
      select: { id: true, nome: true, email: true, saldo: true, saldoSacavel: true },
    })

    // A condição OR com prisma.usuario.fields pode não funcionar. Usar abordagem simples:
    const todos = await prisma.usuario.findMany({
      where: { saldo: { gt: 0 } },
      select: { id: true, nome: true, email: true, saldo: true, saldoSacavel: true },
    })

    const afetados = todos.filter((u) => (u.saldoSacavel ?? 0) < u.saldo)

    if (afetados.length === 0) {
      console.log('✅ Nenhum usuário afetado. SaldoSacavel está correto.')
      return
    }

    console.log(`📋 ${afetados.length} usuário(s) afetado(s):\n`)

    for (const u of afetados) {
      await prisma.usuario.update({
        where: { id: u.id },
        data: { saldoSacavel: u.saldo },
      })
      console.log(`   ${u.nome} (${u.email}): saldoSacavel ${(u.saldoSacavel ?? 0).toFixed(2)} → ${u.saldo.toFixed(2)}`)
    }

    console.log(`\n✅ Corrigido! "${afetados.length}" usuário(s) agora têm saldo disponível para saque.`)
  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

fixSaldoSacavel()
