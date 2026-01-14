import { prisma } from '../lib/prisma'
import { hashPassword } from '../lib/auth'

async function createAdmin() {
  const email = process.argv[2]
  const password = process.argv[3]
  const nome = process.argv[4] || 'Administrador'

  if (!email || !password) {
    console.error('Uso: npm run create-admin <email> <senha> [nome]')
    console.error('Exemplo: npm run create-admin admin@exemplo.com senha123 "Admin Principal"')
    process.exit(1)
  }

  try {
    // Verificar se o usuário já existe
    const existingUser = await prisma.usuario.findUnique({
      where: { email },
    })

    if (existingUser) {
      // Atualizar para admin se já existir
      await prisma.usuario.update({
        where: { email },
        data: {
          isAdmin: true,
          passwordHash: hashPassword(password),
          nome,
        },
      })
      console.log(`✅ Usuário ${email} atualizado para administrador`)
    } else {
      // Criar novo admin
      await prisma.usuario.create({
        data: {
          email,
          nome,
          passwordHash: hashPassword(password),
          isAdmin: true,
          ativo: true,
        },
      })
      console.log(`✅ Administrador ${nome} (${email}) criado com sucesso!`)
    }
  } catch (error) {
    console.error('❌ Erro ao criar administrador:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()
