/**
 * Teste rápido do bichocerto (fallback de resultados)
 * Uso: npx tsx scripts/test-bichocerto.ts
 */
import { buscarResultadosBichoCerto } from '../lib/bichocerto-parser'

async function test() {
  const data = '2026-03-16'
  console.log('=== Teste bichocerto.com ===\n')
  console.log('Data:', data, '\n')

  for (const [cod, nome] of [
    ['ln', 'Nacional'],
    ['lk', 'Look'],
    ['rj', 'PT Rio'],
  ] as [string, string][]) {
    try {
      const r = await buscarResultadosBichoCerto(nome, data)
      console.log(`✅ ${nome} (${cod}): ${r.length} extrações`)
      if (r[0]) {
        console.log(`   Ex: ${r[0].horario} - ${r[0].premios?.length || 0} prêmios`)
      }
    } catch (e: any) {
      console.log(`❌ ${nome}: ${e?.message || e}`)
    }
  }
  console.log('\n=== Fim ===')
  process.exit(0)
}

test()
