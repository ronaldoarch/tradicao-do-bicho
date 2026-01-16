/**
 * Script de testes para o motor de regras de apostas
 * 
 * Execute com: npm run test:manual ou tsx scripts/test-bet-rules.ts
 * 
 * Baseado no guia: docs/REGRAS_COMPLETAS_MODALIDADES.md
 */

import {
  calcularValorPorPalpite,
  calcularUnidades,
  calcularValorUnitario,
  calcularNumero,
  calcularGrupo,
  buscarOdd,
  calcularPremioUnidade,
  calcularPremioPalpite,
  conferirPalpite,
  dezenaParaGrupo,
  milharParaGrupo,
  contarPermutacoesDistintas,
  gerarPermutacoesDistintas,
  conferirGrupoSimples,
  conferirDuplaGrupo,
  conferirTernoGrupo,
  conferirQuadraGrupo,
  conferirNumero,
  conferirPasse,
  gerarResultadoInstantaneo,
  type ModalityType,
  type DivisionType,
} from '../lib/bet-rules-engine'

// Utilitário para testes
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FALHOU: ${message}`)
    process.exit(1)
  } else {
    console.log(`✅ PASSOU: ${message}`)
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    console.error(`❌ FALHOU: ${message}`)
    console.error(`   Esperado: ${expected}`)
    console.error(`   Recebido: ${actual}`)
    process.exit(1)
  } else {
    console.log(`✅ PASSOU: ${message}`)
  }
}

function assertCloseTo(actual: number, expected: number, tolerance: number, message: string) {
  if (Math.abs(actual - expected) > tolerance) {
    console.error(`❌ FALHOU: ${message}`)
    console.error(`   Esperado: ${expected} (±${tolerance})`)
    console.error(`   Recebido: ${actual}`)
    process.exit(1)
  } else {
    console.log(`✅ PASSOU: ${message}`)
  }
}

console.log('🧪 Iniciando testes do motor de regras de apostas...\n')

// ============================================================================
// TESTES DE CONVERSÃO
// ============================================================================

console.log('📐 Testes de Conversão')
console.log('─'.repeat(50))

assertEqual(dezenaParaGrupo(1), 1, 'Dezena 01 → Grupo 01')
assertEqual(dezenaParaGrupo(21), 6, 'Dezena 21 → Grupo 06')
assertEqual(dezenaParaGrupo(0), 25, 'Dezena 00 → Grupo 25')
assertEqual(milharParaGrupo(4321), 6, 'Milhar 4321 → Grupo 06')
assertEqual(milharParaGrupo(1297), 25, 'Milhar 1297 → Grupo 25')

console.log()

// ============================================================================
// TESTES DE PERMUTAÇÕES
// ============================================================================

console.log('🔄 Testes de Permutações')
console.log('─'.repeat(50))

assertEqual(contarPermutacoesDistintas('27'), 2, 'Dezena 27 tem 2 permutações')
assertEqual(contarPermutacoesDistintas('22'), 1, 'Dezena 22 tem 1 permutação')
assertEqual(contarPermutacoesDistintas('384'), 6, 'Centena 384 tem 6 permutações')
assertEqual(contarPermutacoesDistintas('2580'), 24, 'Milhar 2580 tem 24 permutações')

const permutacoes27 = gerarPermutacoesDistintas('27')
assert(permutacoes27.includes('27'), 'Permutações de 27 incluem 27')
assert(permutacoes27.includes('72'), 'Permutações de 27 incluem 72')
assertEqual(permutacoes27.length, 2, 'Permutações de 27 tem 2 elementos')

console.log()

// ============================================================================
// TESTES DE CÁLCULO DE VALOR
// ============================================================================

console.log('💰 Testes de Cálculo de Valor')
console.log('─'.repeat(50))

assertEqual(calcularValorPorPalpite(10, 4, 'each'), 10, '"Para cada": R$ 10,00 com 4 palpites = R$ 10,00')
assertEqual(calcularValorPorPalpite(10, 4, 'all'), 2.5, '"Para todos": R$ 10,00 com 4 palpites = R$ 2,50')
assertEqual(calcularUnidades(1, 1, 5), 5, '1 combinação × 5 posições = 5 unidades')
assertEqual(calcularUnidades(24, 1, 5), 120, '24 combinações × 5 posições = 120 unidades')
assertEqual(calcularValorUnitario(10, 5), 2, 'R$ 10,00 / 5 unidades = R$ 2,00')
assertCloseTo(calcularValorUnitario(10, 30), 0.3333, 0.0001, 'R$ 10,00 / 30 unidades ≈ R$ 0,33')

console.log()

// ============================================================================
// TESTES DE CÁLCULO POR MODALIDADE
// ============================================================================

console.log('🎯 Testes de Cálculo por Modalidade')
console.log('─'.repeat(50))

const calcDezena = calcularNumero('DEZENA', '27', 1, 5, 10)
assertEqual(calcDezena.combinations, 1, 'Dezena normal: 1 combinação')
assertEqual(calcDezena.units, 5, 'Dezena normal: 5 unidades')
assertEqual(calcDezena.unitValue, 2, 'Dezena normal: R$ 2,00 por unidade')

const calcDezenaInv = calcularNumero('DEZENA_INVERTIDA', '27', 1, 5, 10)
assertEqual(calcDezenaInv.combinations, 2, 'Dezena invertida: 2 combinações')
assertEqual(calcDezenaInv.units, 10, 'Dezena invertida: 10 unidades')
assertEqual(calcDezenaInv.unitValue, 1, 'Dezena invertida: R$ 1,00 por unidade')

const calcMilharCentena = calcularNumero('MILHAR_CENTENA', '1236', 1, 5, 10)
assertEqual(calcMilharCentena.combinations, 2, 'Milhar/Centena: 2 combinações')
assertEqual(calcMilharCentena.units, 10, 'Milhar/Centena: 10 unidades')

const calcGrupo = calcularGrupo('GRUPO', 1, 1, 5, 10)
assertEqual(calcGrupo.combinations, 1, 'Grupo simples: 1 combinação')
assertEqual(calcGrupo.units, 5, 'Grupo simples: 5 unidades')

console.log()

// ============================================================================
// TESTES DE ODDS
// ============================================================================

console.log('📊 Testes de Odds')
console.log('─'.repeat(50))

assertEqual(buscarOdd('GRUPO', 1, 5), 18, 'Grupo 1-5: 18x')
assertEqual(buscarOdd('DUPLA_GRUPO', 1, 5), 180, 'Dupla 1-5: 180x')
assertEqual(buscarOdd('TERNO_GRUPO', 1, 5), 1800, 'Terno 1-5: 1800x')
assertEqual(buscarOdd('QUADRA_GRUPO', 1, 5), 5000, 'Quadra 1-5: 5000x')
assertEqual(buscarOdd('DEZENA', 1, 5), 60, 'Dezena 1-5: 60x')
assertEqual(buscarOdd('CENTENA', 1, 5), 600, 'Centena 1-5: 600x')
assertEqual(buscarOdd('MILHAR', 1, 5), 5000, 'Milhar 1-5: 5000x')
assertEqual(buscarOdd('MILHAR_INVERTIDA', 1, 5), 200, 'Milhar invertida 1-5: 200x')
assertEqual(buscarOdd('MILHAR_CENTENA', 1, 5), 3300, 'Milhar/Centena 1-5: 3300x')
assertEqual(buscarOdd('PASSE', 1, 2), 300, 'Passe: 300x')
assertEqual(buscarOdd('PASSE_VAI_E_VEM', 1, 2), 150, 'Passe vai-e-vem: 150x')

console.log()

// ============================================================================
// TESTES DE CÁLCULO DE PRÊMIOS
// ============================================================================

console.log('🏆 Testes de Cálculo de Prêmios')
console.log('─'.repeat(50))

assertEqual(calcularPremioUnidade(18, 2), 36, 'Prêmio unidade: 18 × 2 = 36')
assertEqual(calcularPremioUnidade(180, 2), 360, 'Prêmio unidade: 180 × 2 = 360')
assertEqual(calcularPremioPalpite(1, 360), 360, 'Prêmio palpite: 1 × 360 = 360')
assertEqual(calcularPremioPalpite(0, 360), 0, 'Prêmio palpite: 0 × 360 = 0')

console.log()

// ============================================================================
// TESTES DE CONFERÊNCIA DE RESULTADOS
// ============================================================================

console.log('🔍 Testes de Conferência de Resultados')
console.log('─'.repeat(50))

const resultado = [4321, 589, 7727, 1297, 5060] 
// Verificar grupos manualmente:
// 4321 → dezena 21 → grupo 06
// 589 → dezena 89 → grupo 23
// 7727 → dezena 27 → grupo 07
// 1297 → dezena 97 → grupo 25
// 5060 → dezena 60 → grupo 15
// Grupos: [06, 23, 07, 25, 15]

const prizeGrupo = conferirGrupoSimples(resultado, 6, 1, 5)
assertEqual(prizeGrupo.hits, 1, 'Grupo 06 aparece no resultado')

const prizeDupla = conferirDuplaGrupo(resultado, [6, 15], 1, 5)
assertEqual(prizeDupla.hits, 1, 'Dupla grupos 06 e 15 acerta')

const prizeTerno = conferirTernoGrupo(resultado, [6, 15, 25], 1, 5)
assertEqual(prizeTerno.hits, 1, 'Terno grupos 06, 15, 25 acerta')

const prizeQuadra = conferirQuadraGrupo(resultado, [6, 23, 15, 25], 1, 5)
assertEqual(prizeQuadra.hits, 1, 'Quadra grupos 06, 23, 15, 25 acerta')

const prizeDezena = conferirNumero(resultado, '27', 'DEZENA', 1, 5)
assertEqual(prizeDezena.hits, 1, 'Dezena 27 aparece (7727)')

const prizeCentena = conferirNumero(resultado, '321', 'CENTENA', 1, 5)
assertEqual(prizeCentena.hits, 1, 'Centena 321 aparece (4321)')

const resultadoPasse = [1720, 1456] // Grupo 05 no 1º, Grupo 14 no 2º
const prizePasse = conferirPasse(resultadoPasse, 5, 14, false)
assertEqual(prizePasse.hits, 1, 'Passe 05→14 acerta')

const prizePasseVaiEVem = conferirPasse(resultadoPasse, 5, 14, true)
assertEqual(prizePasseVaiEVem.hits, 1, 'Passe vai-e-vem 05↔14 acerta')

console.log()

// ============================================================================
// EXEMPLOS PRÁTICOS DO GUIA
// ============================================================================

console.log('📚 Exemplos Práticos do Guia')
console.log('─'.repeat(50))

// Exemplo 1: Dupla de Grupo - "Para cada palpite"
const resultadoEx1: any = {
  prizes: [4321, 589, 7727, 1297, 5060], // Grupos: [06, 23, 07, 25, 15]
  groups: [6, 23, 7, 25, 15],
}

const palpite1 = conferirPalpite(
  resultadoEx1,
  'DUPLA_GRUPO',
  { grupos: [6, 15] },
  1,
  5,
  20, // valor por palpite
  'each'
)

assertEqual(palpite1.calculation.units, 5, 'Exemplo 1: 5 unidades')
assertEqual(palpite1.calculation.unitValue, 4, 'Exemplo 1: R$ 4,00 por unidade')
assertEqual(palpite1.prize.hits, 1, 'Exemplo 1: Dupla acertou')
assertEqual(palpite1.totalPrize, 720, 'Exemplo 1: Prêmio R$ 720,00')

// Exemplo 2: Dupla de Grupo - "Para todos os palpites"
const palpite2 = conferirPalpite(
  resultadoEx1,
  'DUPLA_GRUPO',
  { grupos: [6, 15] },
  1,
  5,
  10, // valor por palpite (já dividido)
  'all'
)

assertEqual(palpite2.calculation.unitValue, 2, 'Exemplo 2: R$ 2,00 por unidade')
assertEqual(palpite2.totalPrize, 360, 'Exemplo 2: Prêmio R$ 360,00')

// Exemplo 3: Milhar Invertida
const resultadoEx3: any = {
  prizes: [4321, 589, 2580, 1297, 5060],
  groups: [6, 23, 20, 25, 15],
}

const palpite3 = conferirPalpite(
  resultadoEx3,
  'MILHAR_INVERTIDA',
  { numero: '2580' },
  1,
  5,
  10,
  'each'
)

assertEqual(palpite3.calculation.combinations, 24, 'Exemplo 3: 24 combinações')
assertEqual(palpite3.calculation.units, 120, 'Exemplo 3: 120 unidades')
assertCloseTo(palpite3.calculation.unitValue, 0.0833, 0.0001, 'Exemplo 3: R$ 0,0833 por unidade')
assert(palpite3.prize.hits >= 1, 'Exemplo 3: Milhar invertida acertou')
assertCloseTo(palpite3.totalPrize, 16.67, 0.5, 'Exemplo 3: Prêmio ≈ R$ 16,67')

// Exemplo 4: Quadra de Grupo
const palpite4 = conferirPalpite(
  resultadoEx1,
  'QUADRA_GRUPO',
  { grupos: [6, 23, 15, 25] },
  1,
  5,
  10,
  'each'
)

assertEqual(palpite4.calculation.units, 5, 'Exemplo 4: 5 unidades')
assertEqual(palpite4.calculation.unitValue, 2, 'Exemplo 4: R$ 2,00 por unidade')
assertEqual(palpite4.prize.hits, 1, 'Exemplo 4: Quadra acertou')
assertEqual(palpite4.totalPrize, 10000, 'Exemplo 4: Prêmio R$ 10.000,00')

console.log()

// ============================================================================
// TESTES DE GERAÇÃO DE RESULTADO
// ============================================================================

console.log('🎲 Testes de Geração de Resultado')
console.log('─'.repeat(50))

const resultadoGerado = gerarResultadoInstantaneo(7)
assertEqual(resultadoGerado.prizes.length, 7, 'Gera 7 prêmios')
assertEqual(resultadoGerado.groups.length, 7, 'Gera 7 grupos')

resultadoGerado.prizes.forEach((premio, i) => {
  assert(premio >= 0 && premio < 10000, `Prêmio ${i + 1} é válido (0-9999)`)
})

resultadoGerado.groups.forEach((grupo, i) => {
  assert(grupo >= 1 && grupo <= 25, `Grupo ${i + 1} é válido (1-25)`)
})

console.log()

// ============================================================================
// RESUMO
// ============================================================================

console.log('─'.repeat(50))
console.log('✅ Todos os testes passaram!')
console.log('─'.repeat(50))
console.log('\n📊 Resumo:')
console.log('  • Conversões: OK')
console.log('  • Permutações: OK')
console.log('  • Cálculos de valor: OK')
console.log('  • Cálculos por modalidade: OK')
console.log('  • Odds: OK')
console.log('  • Conferência de resultados: OK')
console.log('  • Exemplos práticos: OK')
console.log('  • Geração de resultados: OK')
console.log('\n🎉 Sistema de regras validado com sucesso!')
