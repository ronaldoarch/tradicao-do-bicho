/**
 * Script para adicionar saldo via API admin
 * Uso: npx tsx scripts/add-saldo-api.ts <userId> <valor> [baseUrl]
 * Exemplo: npx tsx scripts/add-saldo-api.ts 1 100
 */

async function addSaldoViaAPI() {
  const userId = process.argv[2] || '1'
  const valor = parseFloat(process.argv[3] || '100')
  const baseUrl = process.argv[4] || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (!userId || isNaN(parseInt(userId))) {
    console.error('❌ ID do usuário inválido')
    process.exit(1)
  }

  if (!valor || isNaN(valor) || valor <= 0) {
    console.error('❌ Valor inválido')
    process.exit(1)
  }

  try {
    console.log(`📋 Adicionando R$ ${valor.toFixed(2)} ao usuário ID ${userId}...`)
    console.log(`   URL: ${baseUrl}`)

    // Você precisa fornecer o token de autenticação admin
    // Ou fazer login primeiro e copiar o cookie admin_session
    const adminSession = process.env.ADMIN_SESSION_TOKEN

    if (!adminSession) {
      console.error('❌ Token de autenticação admin não fornecido')
      console.error('   Defina a variável ADMIN_SESSION_TOKEN ou faça login no admin e copie o cookie admin_session')
      console.error('   Exemplo: ADMIN_SESSION_TOKEN=seu_token npx tsx scripts/add-saldo-api.ts 1 100')
      process.exit(1)
    }

    const response = await fetch(`${baseUrl}/api/admin/usuarios/${userId}/saldo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `admin_session=${adminSession}`,
      },
      body: JSON.stringify({
        valor,
        descricao: 'Depósito manual via script',
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('❌ Erro ao adicionar saldo:', error.error || error.message)
      process.exit(1)
    }

    const data = await response.json()
    console.log(`\n✅ Saldo adicionado com sucesso!`)
    console.log(`   Valor adicionado: R$ ${valor.toFixed(2)}`)
    console.log(`   Novo saldo: R$ ${data.usuario?.saldo?.toFixed(2) || 'N/A'}`)
    console.log(`   Transação ID: ${data.transacao?.id || 'N/A'}`)
  } catch (error) {
    console.error('❌ Erro ao adicionar saldo:', error)
    process.exit(1)
  }
}

addSaldoViaAPI()
