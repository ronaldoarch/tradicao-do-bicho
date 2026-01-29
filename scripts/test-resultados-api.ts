/**
 * Script de teste para verificar se a API de resultados está funcionando corretamente
 * 
 * Uso: npx tsx scripts/test-resultados-api.ts
 */

import { buscarResultadosAgenciaMidas } from '../lib/agenciamidas-api'

async function testarAPI() {
  console.log('🧪 Testando API de Resultados da Agência Midas\n')
  
  const hoje = new Date().toISOString().split('T')[0]
  const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  
  const loterias = [
    'PT Rio de Janeiro',
    'PT-SP/Bandeirantes',
    'PT Bahia',
    'Loteria Nacional',
    'Federal',
  ]
  
  console.log(`📅 Testando com data de hoje: ${hoje}`)
  console.log(`📅 Testando com data de ontem: ${ontem}\n`)
  
  for (const loteria of loterias) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`🎲 Testando: ${loteria}`)
    console.log(`${'='.repeat(60)}`)
    
    // Testar com data de hoje
    console.log(`\n📅 Data: ${hoje}`)
    try {
      const resultadosHoje = await buscarResultadosAgenciaMidas(loteria, hoje)
      console.log(`✅ Resultados encontrados: ${resultadosHoje.length}`)
      
      if (resultadosHoje.length > 0) {
        console.log(`\n📊 Primeiro resultado:`)
        const primeiro = resultadosHoje[0]
        console.log(`   Horário: ${primeiro.horario}`)
        console.log(`   Prêmios: ${primeiro.premios.length}`)
        if (primeiro.premios.length > 0) {
          const primeiroPremio = primeiro.premios[0]
          console.log(`   Exemplo: ${primeiroPremio.posicao} - ${primeiroPremio.numero} (${primeiroPremio.animal})`)
        }
      } else {
        console.log(`⚠️ Nenhum resultado encontrado para hoje`)
      }
    } catch (error) {
      console.error(`❌ Erro ao buscar resultados:`, error)
    }
    
    // Testar com data de ontem (mais provável ter resultados)
    console.log(`\n📅 Data: ${ontem}`)
    try {
      const resultadosOntem = await buscarResultadosAgenciaMidas(loteria, ontem)
      console.log(`✅ Resultados encontrados: ${resultadosOntem.length}`)
      
      if (resultadosOntem.length > 0) {
        console.log(`\n📊 Primeiro resultado:`)
        const primeiro = resultadosOntem[0]
        console.log(`   Horário: ${primeiro.horario}`)
        console.log(`   Prêmios: ${primeiro.premios.length}`)
        if (primeiro.premios.length > 0) {
          const primeiroPremio = primeiro.premios[0]
          console.log(`   Exemplo: ${primeiroPremio.posicao} - ${primeiroPremio.numero} (${primeiroPremio.animal})`)
        }
      } else {
        console.log(`⚠️ Nenhum resultado encontrado para ontem`)
      }
    } catch (error) {
      console.error(`❌ Erro ao buscar resultados:`, error)
    }
    
    // Pequeno delay entre requisições
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  console.log(`\n${'='.repeat(60)}`)
  console.log('✅ Teste concluído!')
  console.log(`${'='.repeat(60)}\n`)
}

// Executar teste
testarAPI().catch(console.error)
