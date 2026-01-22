import { prisma } from '../lib/prisma'

async function tornarAdmin(email: string) {
  try {
    const usuario = await prisma.usuario.update({
      where: { email },
      data: { isAdmin: true },
    })
    
    console.log(`✅ Usuário ${email} agora é administrador`)
    console.log(`   ID: ${usuario.id}`)
    console.log(`   Nome: ${usuario.nome}`)
    return usuario
  } catch (error: any) {
    if (error.code === 'P2025') {
      console.error(`❌ Usuário com email ${email} não encontrado`)
      process.exit(1)
    }
    throw error
  }
}

// Executar
const email = process.argv[2]
if (!email) {
  console.error('Uso: npx tsx scripts/tornar-usuario-admin.ts <email>')
  process.exit(1)
}

tornarAdmin(email)
  .then(() => {
    prisma.$disconnect()
    process.exit(0)
  })
  .catch((error) => {
    console.error('Erro:', error)
    prisma.$disconnect()
    process.exit(1)
  })
