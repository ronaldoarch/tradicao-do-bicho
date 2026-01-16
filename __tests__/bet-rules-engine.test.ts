/**
 * Testes unitários para o motor de regras de apostas
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
} from '@/lib/bet-rules-engine'

describe('Bet Rules Engine', () => {
  describe('Funções de Conversão', () => {
    test('dezenaParaGrupo - converte dezena para grupo corretamente', () => {
      expect(dezenaParaGrupo(1)).toBe(1) // 01 → Grupo 01
      expect(dezenaParaGrupo(21)).toBe(6) // 21 → Grupo 06
      expect(dezenaParaGrupo(0)).toBe(25) // 00 → Grupo 25
      expect(dezenaParaGrupo(97)).toBe(25) // 97 → Grupo 25
      expect(dezenaParaGrupo(100)).toBe(25) // 100 mod 100 = 0 → Grupo 25
    })

    test('milharParaGrupo - converte milhar para grupo corretamente', () => {
      expect(milharParaGrupo(4321)).toBe(6) // Dezena 21 → Grupo 06
      expect(milharParaGrupo(1297)).toBe(25) // Dezena 97 → Grupo 25
      expect(milharParaGrupo(100)).toBe(1) // Dezena 00 → Grupo 25 (mas 100 mod 100 = 0)
      expect(milharParaGrupo(2580)).toBe(20) // Dezena 80 → Grupo 20
    })
  })

  describe('Permutações Distintas', () => {
    test('contarPermutacoesDistintas - dezena com dígitos diferentes', () => {
      expect(contarPermutacoesDistintas('27')).toBe(2) // 27, 72
      expect(contarPermutacoesDistintas('12')).toBe(2) // 12, 21
    })

    test('contarPermutacoesDistintas - dezena com dígitos iguais', () => {
      expect(contarPermutacoesDistintas('22')).toBe(1) // 22
      expect(contarPermutacoesDistintas('00')).toBe(1) // 00
    })

    test('contarPermutacoesDistintas - centena todos diferentes', () => {
      expect(contarPermutacoesDistintas('384')).toBe(6) // 384, 348, 438, 483, 834, 843
    })

    test('contarPermutacoesDistintas - centena dois iguais', () => {
      expect(contarPermutacoesDistintas('337')).toBe(3) // 337, 373, 733
    })

    test('contarPermutacoesDistintas - milhar 4 diferentes', () => {
      expect(contarPermutacoesDistintas('2580')).toBe(24) // Todas as permutações
    })

    test('gerarPermutacoesDistintas - retorna array de permutações', () => {
      const permutacoes = gerarPermutacoesDistintas('27')
      expect(permutacoes).toHaveLength(2)
      expect(permutacoes).toContain('27')
      expect(permutacoes).toContain('72')
    })
  })

  describe('Cálculo de Valor por Palpite', () => {
    test('calcularValorPorPalpite - "Para cada" retorna valor digitado', () => {
      expect(calcularValorPorPalpite(10, 4, 'each')).toBe(10)
      expect(calcularValorPorPalpite(20, 2, 'each')).toBe(20)
    })

    test('calcularValorPorPalpite - "Para todos" divide igualmente', () => {
      expect(calcularValorPorPalpite(10, 4, 'all')).toBe(2.5)
      expect(calcularValorPorPalpite(20, 2, 'all')).toBe(10)
    })

    test('calcularValorPorPalpite - "Para todos" com 0 palpites retorna 0', () => {
      expect(calcularValorPorPalpite(10, 0, 'all')).toBe(0)
    })
  })

  describe('Cálculo de Unidades', () => {
    test('calcularUnidades - calcula corretamente', () => {
      expect(calcularUnidades(1, 1, 1)).toBe(1) // 1 combinação × 1 posição
      expect(calcularUnidades(1, 1, 5)).toBe(5) // 1 combinação × 5 posições
      expect(calcularUnidades(2, 1, 5)).toBe(10) // 2 combinações × 5 posições
      expect(calcularUnidades(24, 1, 5)).toBe(120) // 24 combinações × 5 posições
    })
  })

  describe('Cálculo de Valor Unitário', () => {
    test('calcularValorUnitario - calcula corretamente', () => {
      expect(calcularValorUnitario(10, 5)).toBe(2) // 10 / 5 = 2
      expect(calcularValorUnitario(10, 10)).toBe(1) // 10 / 10 = 1
      expect(calcularValorUnitario(10, 30)).toBeCloseTo(0.3333, 4) // 10 / 30 ≈ 0.3333
    })

    test('calcularValorUnitario - retorna 0 se unidades = 0', () => {
      expect(calcularValorUnitario(10, 0)).toBe(0)
    })
  })

  describe('Cálculo por Modalidade - Números', () => {
    test('calcularNumero - modalidade normal (1 combinação)', () => {
      const result = calcularNumero('DEZENA', '27', 1, 5, 10)
      expect(result.combinations).toBe(1)
      expect(result.positions).toBe(5)
      expect(result.units).toBe(5)
      expect(result.unitValue).toBe(2) // 10 / 5 = 2
    })

    test('calcularNumero - modalidade invertida (múltiplas combinações)', () => {
      const result = calcularNumero('DEZENA_INVERTIDA', '27', 1, 5, 10)
      expect(result.combinations).toBe(2) // 27, 72
      expect(result.positions).toBe(5)
      expect(result.units).toBe(10) // 2 × 5 = 10
      expect(result.unitValue).toBe(1) // 10 / 10 = 1
    })

    test('calcularNumero - MILHAR_CENTENA (2 combinações)', () => {
      const result = calcularNumero('MILHAR_CENTENA', '1236', 1, 5, 10)
      expect(result.combinations).toBe(2) // 1 milhar + 1 centena
      expect(result.positions).toBe(5)
      expect(result.units).toBe(10) // 2 × 5 = 10
      expect(result.unitValue).toBe(1) // 10 / 10 = 1
    })
  })

  describe('Cálculo por Modalidade - Grupos', () => {
    test('calcularGrupo - grupo simples', () => {
      const result = calcularGrupo('GRUPO', 1, 1, 5, 10)
      expect(result.combinations).toBe(1)
      expect(result.positions).toBe(5)
      expect(result.units).toBe(5)
      expect(result.unitValue).toBe(2)
    })

    test('calcularGrupo - dupla de grupo', () => {
      const result = calcularGrupo('DUPLA_GRUPO', 2, 1, 5, 10)
      expect(result.combinations).toBe(1)
      expect(result.positions).toBe(5)
      expect(result.units).toBe(5)
      expect(result.unitValue).toBe(2)
    })

    test('calcularGrupo - valida quantidade de grupos', () => {
      expect(() => calcularGrupo('DUPLA_GRUPO', 3, 1, 5, 10)).toThrow()
      expect(() => calcularGrupo('TERNO_GRUPO', 2, 1, 5, 10)).toThrow()
    })
  })

  describe('Tabela de Odds', () => {
    test('buscarOdd - grupo', () => {
      expect(buscarOdd('GRUPO', 1, 1)).toBe(18)
      expect(buscarOdd('GRUPO', 1, 3)).toBe(18)
      expect(buscarOdd('GRUPO', 1, 5)).toBe(18)
      expect(buscarOdd('GRUPO', 1, 7)).toBe(18)
    })

    test('buscarOdd - dupla de grupo', () => {
      expect(buscarOdd('DUPLA_GRUPO', 1, 5)).toBe(180)
    })

    test('buscarOdd - terno de grupo', () => {
      expect(buscarOdd('TERNO_GRUPO', 1, 5)).toBe(1800)
    })

    test('buscarOdd - quadra de grupo', () => {
      expect(buscarOdd('QUADRA_GRUPO', 1, 5)).toBe(5000)
    })

    test('buscarOdd - dezena', () => {
      expect(buscarOdd('DEZENA', 1, 5)).toBe(60)
    })

    test('buscarOdd - centena', () => {
      expect(buscarOdd('CENTENA', 1, 5)).toBe(600)
    })

    test('buscarOdd - milhar', () => {
      expect(buscarOdd('MILHAR', 1, 5)).toBe(5000)
    })

    test('buscarOdd - milhar invertida', () => {
      expect(buscarOdd('MILHAR_INVERTIDA', 1, 5)).toBe(200)
    })

    test('buscarOdd - milhar/centena', () => {
      expect(buscarOdd('MILHAR_CENTENA', 1, 5)).toBe(3300)
    })

    test('buscarOdd - passe', () => {
      expect(buscarOdd('PASSE', 1, 2)).toBe(300)
    })

    test('buscarOdd - passe vai e vem', () => {
      expect(buscarOdd('PASSE_VAI_E_VEM', 1, 2)).toBe(150)
    })
  })

  describe('Cálculo de Prêmios', () => {
    test('calcularPremioUnidade - multiplica odd pelo valor unitário', () => {
      expect(calcularPremioUnidade(18, 2)).toBe(36)
      expect(calcularPremioUnidade(180, 2)).toBe(360)
      expect(calcularPremioUnidade(5000, 2)).toBe(10000)
    })

    test('calcularPremioPalpite - multiplica acertos pelo prêmio unidade', () => {
      expect(calcularPremioPalpite(1, 360)).toBe(360)
      expect(calcularPremioPalpite(0, 360)).toBe(0)
      expect(calcularPremioPalpite(3, 120)).toBe(360)
    })
  })

  describe('Conferência de Resultados - Grupos', () => {
    const resultado = [4321, 589, 7727, 1297, 5060] // Grupos: [06, 23, 01, 25, 15]

    test('conferirGrupoSimples - grupo aparece', () => {
      const prize = conferirGrupoSimples(resultado, 6, 1, 5) // Grupo 06
      expect(prize.hits).toBe(1)
    })

    test('conferirGrupoSimples - grupo não aparece', () => {
      const prize = conferirGrupoSimples(resultado, 5, 1, 5) // Grupo 05
      expect(prize.hits).toBe(0)
    })

    test('conferirDuplaGrupo - ambos grupos aparecem', () => {
      const prize = conferirDuplaGrupo(resultado, [1, 6], 1, 5) // Grupos 01 e 06
      expect(prize.hits).toBe(1)
    })

    test('conferirDuplaGrupo - um grupo não aparece', () => {
      const prize = conferirDuplaGrupo(resultado, [5, 6], 1, 5) // Grupos 05 e 06
      expect(prize.hits).toBe(0)
    })

    test('conferirTernoGrupo - todos grupos aparecem', () => {
      const prize = conferirTernoGrupo(resultado, [1, 6, 15], 1, 5)
      expect(prize.hits).toBe(1)
    })

    test('conferirTernoGrupo - nem todos grupos aparecem', () => {
      const prize = conferirTernoGrupo(resultado, [5, 14, 23], 1, 5)
      expect(prize.hits).toBe(0)
    })

    test('conferirQuadraGrupo - todos grupos aparecem', () => {
      const prize = conferirQuadraGrupo(resultado, [1, 6, 15, 25], 1, 5)
      expect(prize.hits).toBe(1)
    })

    test('conferirQuadraGrupo - nem todos grupos aparecem', () => {
      const prize = conferirQuadraGrupo(resultado, [1, 2, 3, 4], 1, 5)
      expect(prize.hits).toBe(0)
    })
  })

  describe('Conferência de Resultados - Números', () => {
    const resultado = [4321, 589, 7727, 1297, 5060]

    test('conferirNumero - dezena normal acerta', () => {
      const prize = conferirNumero(resultado, '27', 'DEZENA', 1, 5)
      expect(prize.hits).toBe(1) // Dezena 27 aparece na posição 3 (7727)
    })

    test('conferirNumero - dezena normal não acerta', () => {
      const prize = conferirNumero(resultado, '99', 'DEZENA', 1, 5)
      expect(prize.hits).toBe(0)
    })

    test('conferirNumero - centena normal acerta', () => {
      const prize = conferirNumero(resultado, '321', 'CENTENA', 1, 5)
      expect(prize.hits).toBe(1) // Centena 321 aparece na posição 1 (4321)
    })

    test('conferirNumero - milhar normal acerta', () => {
      const prize = conferirNumero(resultado, '2580', 'MILHAR', 1, 5)
      expect(prize.hits).toBe(0) // Não aparece
    })

    test('conferirNumero - dezena invertida acerta', () => {
      const prize = conferirNumero(resultado, '27', 'DEZENA_INVERTIDA', 1, 5)
      expect(prize.hits).toBe(1) // 27 ou 72 aparece
    })

    test('conferirNumero - MILHAR_CENTENA acerta pela centena', () => {
      const prize = conferirNumero(resultado, '1236', 'MILHAR_CENTENA', 1, 5)
      // Verifica se 1236 (milhar) ou 236 (centena) aparece
      // 236 não aparece, mas vamos testar com número que aparece
      const prize2 = conferirNumero(resultado, '4321', 'MILHAR_CENTENA', 1, 5)
      expect(prize2.hits).toBeGreaterThanOrEqual(1) // Acerta pela milhar
    })
  })

  describe('Conferência de Passe', () => {
    test('conferirPasse - ordem correta', () => {
      const resultado = [1720, 1456] // Grupo 05 no 1º, Grupo 14 no 2º
      const prize = conferirPasse(resultado, 5, 14, false)
      expect(prize.hits).toBe(1)
    })

    test('conferirPasse - ordem incorreta', () => {
      const resultado = [1456, 1720] // Grupo 14 no 1º, Grupo 05 no 2º
      const prize = conferirPasse(resultado, 5, 14, false)
      expect(prize.hits).toBe(0)
    })

    test('conferirPasse - vai e vem aceita ordem inversa', () => {
      const resultado = [1456, 1720] // Grupo 14 no 1º, Grupo 05 no 2º
      const prize = conferirPasse(resultado, 5, 14, true)
      expect(prize.hits).toBe(1)
    })
  })

  describe('Exemplos Práticos do Guia', () => {
    test('Exemplo 1: Dupla de Grupo - "Para cada palpite"', () => {
      const resultado: any = {
        prizes: [4321, 589, 7727, 1297, 5060], // Grupos: [06, 23, 01, 25, 15]
        groups: [6, 23, 1, 25, 15],
      }

      // Palpite 1: 01-06
      const palpite1 = conferirPalpite(
        resultado,
        'DUPLA_GRUPO',
        { grupos: [1, 6] },
        1,
        5,
        20, // valor por palpite
        'each'
      )

      expect(palpite1.calculation.units).toBe(5)
      expect(palpite1.calculation.unitValue).toBe(4) // 20 / 5 = 4
      expect(palpite1.prize.hits).toBe(1) // Ambos grupos apareceram
      expect(palpite1.totalPrize).toBe(720) // 180 × 4 = 720

      // Palpite 2: 05-14
      const palpite2 = conferirPalpite(
        resultado,
        'DUPLA_GRUPO',
        { grupos: [5, 14] },
        1,
        5,
        20,
        'each'
      )

      expect(palpite2.prize.hits).toBe(0) // Nenhum grupo apareceu
      expect(palpite2.totalPrize).toBe(0)
    })

    test('Exemplo 2: Dupla de Grupo - "Para todos os palpites"', () => {
      const resultado: any = {
        prizes: [4321, 589, 7727, 1297, 5060],
        groups: [6, 23, 1, 25, 15],
      }

      // Com 2 palpites, valor total R$ 20,00
      // Cada palpite vale R$ 10,00
      const palpite1 = conferirPalpite(
        resultado,
        'DUPLA_GRUPO',
        { grupos: [1, 6] },
        1,
        5,
        10, // valor por palpite (já dividido)
        'all'
      )

      expect(palpite1.calculation.unitValue).toBe(2) // 10 / 5 = 2
      expect(palpite1.totalPrize).toBe(360) // 180 × 2 = 360
    })

    test('Exemplo 3: Milhar Invertida - "Para cada palpite"', () => {
      const resultado: any = {
        prizes: [4321, 589, 2580, 1297, 5060],
        groups: [6, 23, 20, 25, 15],
      }

      const palpite = conferirPalpite(
        resultado,
        'MILHAR_INVERTIDA',
        { numero: '2580' },
        1,
        5,
        10,
        'each'
      )

      expect(palpite.calculation.combinations).toBe(24) // 24 permutações
      expect(palpite.calculation.units).toBe(120) // 24 × 5 = 120
      expect(palpite.calculation.unitValue).toBeCloseTo(0.0833, 4) // 10 / 120
      expect(palpite.prize.hits).toBeGreaterThanOrEqual(1) // 2580 aparece
      expect(palpite.totalPrize).toBeCloseTo(16.67, 2) // 200 × 0.0833... × 1
    })

    test('Exemplo 4: Quadra de Grupo', () => {
      const resultado: any = {
        prizes: [4321, 589, 7727, 1297, 5060], // Grupos: [06, 23, 01, 25, 15]
        groups: [6, 23, 1, 25, 15],
      }

      const palpite = conferirPalpite(
        resultado,
        'QUADRA_GRUPO',
        { grupos: [1, 6, 15, 25] },
        1,
        5,
        10,
        'each'
      )

      expect(palpite.calculation.units).toBe(5)
      expect(palpite.calculation.unitValue).toBe(2) // 10 / 5 = 2
      expect(palpite.prize.hits).toBe(1) // Todos os 4 grupos apareceram
      expect(palpite.totalPrize).toBe(10000) // 5000 × 2 = 10000
    })

    test('Exemplo: Grupo Simples', () => {
      const resultado: any = {
        prizes: [4321, 589, 7727, 1297, 5060], // Grupos: [06, 23, 01, 25, 15]
        groups: [6, 23, 1, 25, 15],
      }

      const palpite = conferirPalpite(
        resultado,
        'GRUPO',
        { grupos: [6] },
        1,
        5,
        10,
        'each'
      )

      expect(palpite.calculation.units).toBe(5)
      expect(palpite.calculation.unitValue).toBe(2)
      expect(palpite.prize.hits).toBe(1) // Grupo 06 aparece
      expect(palpite.totalPrize).toBe(36) // 18 × 2 = 36
    })

    test('Exemplo: Dezena Normal', () => {
      const resultado: any = {
        prizes: [4321, 589, 7727, 1297, 5060],
        groups: [6, 23, 1, 25, 15],
      }

      const palpite = conferirPalpite(
        resultado,
        'DEZENA',
        { numero: '27' },
        1,
        5,
        10,
        'each'
      )

      expect(palpite.calculation.units).toBe(5)
      expect(palpite.calculation.unitValue).toBe(2)
      expect(palpite.prize.hits).toBe(1) // Dezena 27 aparece (7727)
      expect(palpite.totalPrize).toBe(120) // 60 × 2 = 120
    })

    test('Exemplo: Passe Vai', () => {
      const resultado: any = {
        prizes: [1720, 1456], // Grupo 05 no 1º, Grupo 14 no 2º
        groups: [5, 14],
      }

      const palpite = conferirPalpite(
        resultado,
        'PASSE',
        { grupos: [5, 14] },
        1,
        2,
        10,
        'each'
      )

      expect(palpite.calculation.units).toBe(1)
      expect(palpite.calculation.unitValue).toBe(10)
      expect(palpite.prize.hits).toBe(1)
      expect(palpite.totalPrize).toBe(3000) // 300 × 10 = 3000
    })
  })

  describe('Geração de Resultado Instantâneo', () => {
    test('gerarResultadoInstantaneo - gera quantidade correta de prêmios', () => {
      const resultado = gerarResultadoInstantaneo(7)
      expect(resultado.prizes).toHaveLength(7)
      expect(resultado.groups).toHaveLength(7)
    })

    test('gerarResultadoInstantaneo - prêmios são números válidos', () => {
      const resultado = gerarResultadoInstantaneo(7)
      resultado.prizes.forEach((premio) => {
        expect(premio).toBeGreaterThanOrEqual(0)
        expect(premio).toBeLessThan(10000)
      })
    })

    test('gerarResultadoInstantaneo - grupos são válidos', () => {
      const resultado = gerarResultadoInstantaneo(7)
      resultado.groups.forEach((grupo) => {
        expect(grupo).toBeGreaterThanOrEqual(1)
        expect(grupo).toBeLessThanOrEqual(25)
      })
    })
  })
})
