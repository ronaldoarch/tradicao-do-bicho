# 🛠️ Guia de Implementação: Soluções de Liquidação

**Última atualização:** 15 de Janeiro de 2026

Este guia fornece instruções passo a passo para implementar as soluções de liquidação em outros sistemas.

---

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Solução 1: Normalização de Horários](#solução-1-normalização-de-horários)
3. [Solução 2: Verificação de Horário de Apuração](#solução-2-verificação-de-horário-de-apuração)
4. [Estrutura de Dados Necessária](#estrutura-de-dados-necessária)
5. [Exemplos Completos](#exemplos-completos)
6. [Testes](#testes)

---

## 🎯 Pré-requisitos

Antes de começar, você precisa ter:

1. **Lista de extrações/loterias** com:
   - ID único
   - Nome da loteria
   - Horário interno (`time`)
   - Horário de fechamento (`closeTime`)
   - Status ativo (`active`)

2. **Mapeamento de horários reais de apuração** com:
   - Nome da loteria
   - Horário interno
   - Horário inicial real (`startTimeReal`)
   - Horário final real (`closeTimeReal`)
   - Dias sem sorteio (`diasSemSorteio`)

3. **API ou função para buscar resultados** que retorna:
   - Nome da loteria
   - Horário do resultado
   - Data do resultado
   - Prêmios (milhares)

---

## 🔧 Solução 1: Normalização de Horários

### Objetivo
Normalizar horários dos resultados da API externa para os horários internos do sistema, garantindo que resultados sejam associados corretamente às apostas.

### Passo 1: Criar Estrutura de Dados

**1.1. Criar arquivo de horários reais de apuração**

```typescript
// data/horarios-reais-apuracao.ts (ou equivalente)

export interface HorarioRealApuracao {
  name: string           // Nome da loteria (ex: "PT RIO", "LOOK")
  time: string           // Horário interno (ex: "09:20", "20:15")
  startTimeReal: string  // Horário inicial real (ex: "09:00")
  closeTimeReal: string  // Horário final real (ex: "09:30")
  diasSemSorteio?: number[] // Dias sem sorteio [0=Domingo, 1=Segunda, ..., 6=Sábado]
}

export const HORARIOS_REAIS_APURACAO: HorarioRealApuracao[] = [
  {
    name: 'PT RIO',
    time: '09:20',
    startTimeReal: '09:00',
    closeTimeReal: '09:30',
    diasSemSorteio: [0, 6] // Sem sorteio domingo e sábado
  },
  {
    name: 'PT SP',
    time: '20:15',
    startTimeReal: '20:30',
    closeTimeReal: '21:00',
    diasSemSorteio: [0, 3, 5, 6] // Sem sorteio domingo, quarta, sexta e sábado
  },
  {
    name: 'LOOK',
    time: '10:00',
    startTimeReal: '10:00',
    closeTimeReal: '10:30',
    diasSemSorteio: []
  },
  // ... adicionar todas as extrações
]

/**
 * Busca o horário real de apuração para uma loteria
 */
export function getHorarioRealApuracao(
  name: string,
  time: string
): HorarioRealApuracao | null {
  return HORARIOS_REAIS_APURACAO.find(
    h => h.name.toUpperCase() === name.toUpperCase().trim() &&
         h.time === time.trim()
  ) || null
}
```

**1.2. Criar arquivo de extrações (se ainda não existir)**

```typescript
// data/extracoes.ts (ou equivalente)

export interface Extracao {
  id: number
  name: string
  time: string           // Horário interno
  closeTime?: string     // Horário de fechamento
  active: boolean
  // ... outros campos
}

export const extracoes: Extracao[] = [
  { id: 1, name: 'PT RIO', time: '09:20', closeTime: '09:20', active: true },
  { id: 2, name: 'PT SP', time: '20:15', closeTime: '20:15', active: true },
  { id: 3, name: 'LOOK', time: '10:00', closeTime: '10:00', active: true },
  // ... adicionar todas as extrações
]
```

### Passo 2: Implementar Função de Normalização

**2.1. Criar função `normalizarHorarioResultado()`**

```typescript
// lib/resultados-helpers.ts (ou equivalente)

import { extracoes } from '@/data/extracoes'
import { getHorarioRealApuracao } from '@/data/horarios-reais-apuracao'

/**
 * Normaliza o horário do resultado para o horário correto de fechamento da extração
 * 
 * @param loteriaNome Nome da loteria (ex: "PT SP", "LOOK", "LOTECE")
 * @param horarioResultado Horário que veio do resultado (ex: "20:40", "10:40")
 * @returns Horário normalizado para fechamento (ex: "20:15", "10:00") ou o horário original se não encontrar
 */
export function normalizarHorarioResultado(
  loteriaNome: string,
  horarioResultado: string
): string {
  // Validação básica
  if (!loteriaNome || !horarioResultado) {
    return horarioResultado
  }
  
  // Normalizar nome da loteria
  const nomeNormalizado = loteriaNome.toUpperCase().trim()
  
  // Normalizar horário do resultado (formato HH:MM)
  const horarioNormalizado = horarioResultado
    .replace(/[h:]/g, ':')  // Substituir "h" por ":"
    .replace(/^(\d{1,2}):(\d{2})$/, (_, h, m) => {
      return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`
    })
  
  // Converter para minutos para comparação
  const [horaResultado, minutoResultado] = horarioNormalizado.split(':').map(Number)
  
  if (isNaN(horaResultado) || isNaN(minutoResultado)) {
    return horarioResultado // Retorna original se inválido
  }
  
  const minutosResultado = horaResultado * 60 + minutoResultado
  
  // Buscar todas as extrações com esse nome
  const extracoesComMesmoNome = extracoes.filter(
    e => e.name.toUpperCase() === nomeNormalizado && e.active
  )
  
  if (extracoesComMesmoNome.length === 0) {
    return horarioResultado // Retorna original se não encontrar extração
  }
  
  let melhorMatch: { extracao: Extracao, diferenca: number } | null = null
  
  // Para cada extração, verificar se o horário do resultado corresponde ao horário real
  for (const extracao of extracoesComMesmoNome) {
    // Buscar horário real de apuração
    const horarioReal = getHorarioRealApuracao(extracao.name, extracao.time)
    
    if (horarioReal) {
      // Verificar match exato com closeTimeReal (horário quando o resultado deve estar disponível)
      const [horaFim, minutoFim] = horarioReal.closeTimeReal.split(':').map(Number)
      const minutosFim = horaFim * 60 + minutoFim
      
      // Match exato com closeTimeReal
      if (minutosResultado === minutosFim) {
        return extracao.time // Retorna horário interno normalizado
      }
      
      // Verificar se está dentro do intervalo de apuração
      const [horaInicio, minutoInicio] = horarioReal.startTimeReal.split(':').map(Number)
      const minutosInicio = horaInicio * 60 + minutoInicio
      
      if (minutosResultado >= minutosInicio && minutosResultado <= minutosFim) {
        // Calcular diferença para escolher o melhor match se houver múltiplos
        const diferenca = Math.abs(minutosResultado - minutosFim)
        if (!melhorMatch || diferenca < melhorMatch.diferenca) {
          melhorMatch = { extracao, diferenca }
        }
      }
    }
  }
  
  // Se encontrou match dentro do intervalo, retornar o melhor
  if (melhorMatch) {
    return melhorMatch.extracao.time
  }
  
  // Fallback: verificar match aproximado com horário interno (dentro de 30 minutos)
  for (const extracao of extracoesComMesmoNome) {
    const [horaExtracao, minutoExtracao] = extracao.time.split(':').map(Number)
    if (isNaN(horaExtracao) || isNaN(minutoExtracao)) continue
    
    const minutosExtracao = horaExtracao * 60 + minutoExtracao
    const diferenca = Math.abs(minutosResultado - minutosExtracao)
    
    if (diferenca <= 30) {
      return extracao.time
    }
  }
  
  // Se não encontrou match, retornar horário original
  return horarioResultado
}
```

### Passo 3: Aplicar Normalização na API de Resultados

**3.1. Aplicar normalização ao processar resultados**

```typescript
// app/api/resultados/route.ts (ou equivalente)

import { normalizarHorarioResultado } from '@/lib/resultados-helpers'

export async function GET(request: Request) {
  // ... buscar resultados da API externa ...
  
  const resultadosExternos = await buscarResultadosExternos()
  
  Object.entries(organizados).forEach(([tabela, horarios]) => {
    Object.entries(horarios as Record<string, any[]>).forEach(([horario, lista]) => {
      // Normalizar horário do resultado
      const horarioNormalizado = normalizarHorarioResultado(tabela, horario)
      
      const resultadosNormalizados = lista.map((item: any) => ({
        ...item,
        horario: horarioNormalizado,      // Horário normalizado
        drawTime: horarioNormalizado,      // Mesmo horário normalizado
        horarioOriginal: horario !== horarioNormalizado ? horario : undefined // Manter original para referência
      }))
      
      // ... processar resultados normalizados ...
    })
  })
  
  return Response.json({ resultados: resultadosNormalizados })
}
```

### Passo 4: Testar Normalização

```typescript
// Testes unitários

describe('normalizarHorarioResultado', () => {
  test('deve normalizar horário de PT SP corretamente', () => {
    // Resultado vem com horário 20:40 (horário real de apuração)
    // Deve normalizar para 20:15 (horário interno)
    const resultado = normalizarHorarioResultado('PT SP', '20:40')
    expect(resultado).toBe('20:15')
  })
  
  test('deve normalizar horário de LOOK corretamente', () => {
    // Resultado vem com horário 10:30 (horário real de apuração)
    // Deve normalizar para 10:00 (horário interno)
    const resultado = normalizarHorarioResultado('LOOK', '10:30')
    expect(resultado).toBe('10:00')
  })
  
  test('deve retornar original se não encontrar match', () => {
    const resultado = normalizarHorarioResultado('LOTERIA_INEXISTENTE', '15:00')
    expect(resultado).toBe('15:00')
  })
})
```

---

## 🔧 Solução 2: Verificação de Horário de Apuração

### Objetivo
Verificar se já passou o horário de apuração antes de liquidar apostas, evitando liquidações prematuras.

### Passo 1: Criar Função Auxiliar para Verificar Dia da Semana

**1.1. Adicionar função `temSorteioNoDia()`**

```typescript
// data/horarios-reais-apuracao.ts (ou equivalente)

/**
 * Verifica se um dia da semana tem sorteio para uma extração específica
 * 
 * @param horarioReal Horário real de apuração
 * @param diaSemana Dia da semana (0=Domingo, 1=Segunda, ..., 6=Sábado)
 * @returns true se tem sorteio, false caso contrário
 */
export function temSorteioNoDia(
  horarioReal: HorarioRealApuracao | null,
  diaSemana: number
): boolean {
  if (!horarioReal) {
    return true // Se não encontrou horário, assume que tem sorteio (comportamento antigo)
  }
  
  if (!horarioReal.diasSemSorteio || horarioReal.diasSemSorteio.length === 0) {
    return true // Todos os dias têm sorteio
  }
  
  return !horarioReal.diasSemSorteio.includes(diaSemana)
}
```

### Passo 2: Implementar Função de Verificação

**2.1. Criar função `jaPassouHorarioApuracao()`**

A função já está implementada em `app/api/resultados/liquidar/route.ts` conforme o guia.

### Passo 3: Usar Verificação na Liquidação

**3.1. Aplicar verificação antes de liquidar cada aposta**

```typescript
// app/api/resultados/liquidar/route.ts (ou equivalente)

export async function POST(request: Request) {
  // ... buscar apostas pendentes ...
  
  const apostasPendentes = await buscarApostasPendentes()
  
  for (const aposta of apostasPendentes) {
    // Verificar se já passou o horário de apuração
    let nomeLoteria: string | null = null
    if (/^\d+$/.test(aposta.loteria)) {
      const extracaoId = parseInt(aposta.loteria, 10)
      const extracao = extracoes.find((e) => e.id === extracaoId)
      nomeLoteria = extracao?.name || null
    } else {
      nomeLoteria = aposta.loteria
    }
    
    const podeLiquidar = jaPassouHorarioApuracao(
      nomeLoteria,
      aposta.dataConcurso,
      aposta.horario && aposta.horario !== 'null' ? aposta.horario : undefined
    )
    
    if (!podeLiquidar) {
      console.log(`⏸️  Pulando aposta ${aposta.id} - aguardando apuração`)
      continue // Pular esta aposta
    }
    
    // ... continuar com liquidação ...
  }
}
```

### Passo 4: Testar Verificação

```typescript
// Testes unitários

describe('jaPassouHorarioApuracao', () => {
  test('deve permitir liquidar se já passou o horário', () => {
    const dataConcurso = new Date('2026-01-15')
    const agora = new Date('2026-01-15T10:00:00') // 10:00
    
    // Mock do Date para retornar horário específico
    jest.spyOn(global, 'Date').mockImplementation(() => agora as any)
    
    // PT RIO com horário 09:20, startTimeReal 09:00
    // Se agora é 10:00, já passou
    const resultado = jaPassouHorarioApuracao('PT RIO', dataConcurso, '09:20')
    expect(resultado).toBe(true)
  })
  
  test('deve bloquear se ainda não passou o horário', () => {
    const dataConcurso = new Date('2026-01-15')
    const agora = new Date('2026-01-15T08:00:00') // 08:00
    
    jest.spyOn(global, 'Date').mockImplementation(() => agora as any)
    
    // PT RIO com horário 09:20, startTimeReal 09:00
    // Se agora é 08:00, ainda não passou
    const resultado = jaPassouHorarioApuracao('PT RIO', dataConcurso, '09:20')
    expect(resultado).toBe(false)
  })
  
  test('deve bloquear se não tem sorteio no dia', () => {
    const dataConcurso = new Date('2026-01-18') // Domingo (dia 0)
    const agora = new Date('2026-01-18T10:00:00')
    
    jest.spyOn(global, 'Date').mockImplementation(() => agora as any)
    
    // PT RIO não tem sorteio no domingo
    const resultado = jaPassouHorarioApuracao('PT RIO', dataConcurso, '09:20')
    expect(resultado).toBe(false)
  })
  
  test('deve permitir liquidar se é dia passado', () => {
    const dataConcurso = new Date('2026-01-14') // Ontem
    const agora = new Date('2026-01-15T10:00:00') // Hoje
    
    jest.spyOn(global, 'Date').mockImplementation(() => agora as any)
    
    const resultado = jaPassouHorarioApuracao('PT RIO', dataConcurso, '09:20')
    expect(resultado).toBe(true)
  })
  
  test('deve bloquear se é dia futuro', () => {
    const dataConcurso = new Date('2026-01-16') // Amanhã
    const agora = new Date('2026-01-15T10:00:00') // Hoje
    
    jest.spyOn(global, 'Date').mockImplementation(() => agora as any)
    
    const resultado = jaPassouHorarioApuracao('PT RIO', dataConcurso, '09:20')
    expect(resultado).toBe(false)
  })
})
```

---

## 📊 Estrutura de Dados Necessária

### 1. Interface de Extração

```typescript
interface Extracao {
  id: number
  name: string              // Nome da loteria (ex: "PT RIO", "LOOK")
  time: string              // Horário interno (ex: "09:20", "20:15")
  closeTime?: string         // Horário de fechamento (opcional)
  active: boolean            // Se está ativa
  // ... outros campos
}
```

### 2. Interface de Horário Real

```typescript
interface HorarioRealApuracao {
  name: string               // Nome da loteria
  time: string               // Horário interno
  startTimeReal: string      // Horário inicial real (ex: "09:00")
  closeTimeReal: string      // Horário final real (ex: "09:30")
  diasSemSorteio?: number[]  // Dias sem sorteio [0=Domingo, ..., 6=Sábado]
}
```

### 3. Interface de Resultado

```typescript
interface ResultadoItem {
  loteria: string            // Nome da loteria
  horario: string            // Horário normalizado
  drawTime: string           // Horário normalizado (mesmo que horario)
  horarioOriginal?: string   // Horário original (opcional, para referência)
  date: string               // Data do resultado
  position: number           // Posição do prêmio
  milhar: number             // Milhar sorteado
  // ... outros campos
}
```

### 4. Interface de Aposta

```typescript
interface Aposta {
  id: number
  loteria: string | number   // ID ou nome da loteria
  horario: string | null     // Horário da aposta
  dataConcurso: Date | null  // Data do concurso
  // ... outros campos
}
```

---

## 📝 Exemplos Completos

### Exemplo 1: Normalização de Horário PT SP

```typescript
// Cenário: Resultado vem com horário "20:40" (horário real de apuração)
// Objetivo: Normalizar para "20:15" (horário interno)

const resultadoOriginal = {
  loteria: 'PT SP',
  horario: '20:40',
  milhar: 1234,
  position: 1
}

const horarioNormalizado = normalizarHorarioResultado(
  resultadoOriginal.loteria,
  resultadoOriginal.horario
)
// horarioNormalizado = "20:15"

const resultadoNormalizado = {
  ...resultadoOriginal,
  horario: horarioNormalizado,
  drawTime: horarioNormalizado,
  horarioOriginal: resultadoOriginal.horario
}
```

### Exemplo 2: Verificação de Horário Antes de Liquidar

```typescript
// Cenário: Aposta de PT RIO às 09:20 no dia 15/01/2026
// Objetivo: Verificar se já passou o horário de apuração antes de liquidar

const aposta = {
  id: 123,
  loteria: 'PT RIO', // Nome da loteria
  horario: '09:20',
  dataConcurso: new Date('2026-01-15')
}

// Verificar se pode liquidar
const podeLiquidar = jaPassouHorarioApuracao(
  aposta.loteria,
  aposta.dataConcurso,
  aposta.horario
)

if (!podeLiquidar) {
  console.log('⏸️  Aguardando apuração...')
  return
}

// Continuar com liquidação...
```

---

## ✅ Checklist de Implementação

### Solução 1: Normalização de Horários

- [x] Criar arquivo `horarios-reais-apuracao.ts` com estrutura de dados
- [x] Criar arquivo `extracoes.ts` com lista de extrações
- [x] Implementar função `getHorarioRealApuracao()`
- [x] Implementar função `normalizarHorarioResultado()`
- [x] Aplicar normalização na API de resultados
- [ ] Testar normalização com diferentes loterias
- [ ] Verificar se horários estão sendo normalizados corretamente

### Solução 2: Verificação de Horário de Apuração

- [x] Implementar função `temSorteioNoDia()`
- [x] Implementar função `jaPassouHorarioApuracao()`
- [x] Aplicar verificação antes de liquidar cada aposta
- [ ] Testar verificação com diferentes cenários:
  - [ ] Horário já passou
  - [ ] Horário ainda não passou
  - [ ] Dia sem sorteio
  - [ ] Dia passado
  - [ ] Dia futuro
- [x] Verificar logs de debug estão funcionando

---

## 🔗 Referências

- **Documento de Soluções:** `/docs/TROUBLESHOOTING.md`
- **Guia de Lógica do Backend:** `/docs/GUIA_LOGICA_BACKEND.md`
- **Código de Referência:** 
  - `/lib/resultados-helpers.ts` (normalização)
  - `/app/api/resultados/route.ts` (aplicação da normalização)
  - `/app/api/resultados/liquidar/route.ts` (verificação)
  - `/data/horarios-reais-apuracao.ts` (estrutura de dados)

---

**Última atualização:** 15 de Janeiro de 2026
