# 📚 Guia Completo: Lógica do Backend - Sistema de Jogo do Bicho

**Última atualização:** 15 de Janeiro de 2026

Este documento descreve **toda a lógica do backend** implementada no sistema, incluindo arquitetura, fluxos, regras de negócio, cálculos e validações.

---

## 📋 Índice

1. [Arquitetura Geral](#arquitetura-geral)
2. [Autenticação e Autorização](#autenticação-e-autorização)
3. [Sistema de Apostas](#sistema-de-apostas)
4. [Sistema de Liquidação](#sistema-de-liquidação)
5. [Sistema de Resultados](#sistema-de-resultados)
6. [Regras de Negócio](#regras-de-negócio)
7. [Cálculos e Prêmios](#cálculos-e-prêmios)
8. [Validações](#validações)
9. [Estrutura de Dados](#estrutura-de-dados)
10. [APIs Principais](#apis-principais)
11. [Fluxos Completos](#fluxos-completos)

---

## 🏗️ Arquitetura Geral

### Stack Tecnológico

- **Framework:** Next.js 14 (App Router)
- **Linguagem:** TypeScript
- **Banco de Dados:** PostgreSQL
- **ORM:** Prisma
- **Autenticação:** Cookies + Base64URL tokens
- **APIs:** Next.js API Routes

### Estrutura de Pastas

```
app/
├── api/                    # APIs do backend
│   ├── apostas/           # CRUD de apostas
│   ├── resultados/        # Busca e liquidação de resultados
│   ├── auth/              # Autenticação
│   └── admin/             # APIs administrativas
lib/
├── bet-rules-engine.ts    # Motor de regras de apostas
├── auth.ts                # Autenticação
├── prisma.ts              # Cliente Prisma
├── extracao-helpers.ts    # Funções auxiliares de extrações
└── position-parser.ts     # Parser de posições
data/
├── extracoes.ts           # Lista de extrações
├── animals.ts             # Lista de animais/grupos
├── modalities.ts          # Modalidades disponíveis
└── horarios-reais-apuracao.ts  # Horários reais de apuração
```

---

## 🔐 Autenticação e Autorização

### Sistema de Sessão

**Arquivo:** `lib/auth.ts`

**Método:** Cookies + Base64URL tokens (sem JWT)

**Fluxo:**

1. **Login:**
   ```typescript
   // Hash da senha
   const passwordHash = hashPassword(password)
   // passwordHash = SHA256(password + AUTH_SECRET)
   
   // Criar token de sessão
   const token = createSessionToken({ id, email, nome })
   // token = Base64URL(JSON.stringify({ id, email, nome }))
   
   // Salvar em cookie
   cookies().set('lotbicho_session', token)
   ```

2. **Verificação:**
   ```typescript
   const session = cookies().get('lotbicho_session')?.value
   const user = parseSessionToken(session)
   // user = { id, email, nome } ou undefined
   ```

3. **Logout:**
   ```typescript
   cookies().delete('lotbicho_session')
   ```

### Funções Principais

```typescript
// Hash de senha
function hashPassword(password: string): string {
  return crypto.createHash('sha256')
    .update(`${password}:${AUTH_SECRET}`)
    .digest('hex')
}

// Criar token de sessão
function createSessionToken(payload: SessionPayload): string {
  return Buffer.from(JSON.stringify(payload))
    .toString('base64url')
}

// Parsear token de sessão
function parseSessionToken(token?: string | null): SessionPayload | undefined {
  if (!token) return undefined
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    return JSON.parse(decoded) as SessionPayload
  } catch {
    return undefined
  }
}
```

### Proteção de Rotas

```typescript
// Exemplo de rota protegida
export async function POST(request: Request) {
  const session = cookies().get('lotbicho_session')?.value
  const user = parseSessionToken(session)
  
  if (!user) {
    return NextResponse.json(
      { error: 'Não autenticado' },
      { status: 401 }
    )
  }
  
  // ... lógica da rota ...
}
```

---

## 🎯 Sistema de Apostas

### Fluxo Completo de Criação de Aposta

**Arquivo:** `app/api/apostas/route.ts`

#### 1. Validação Inicial

```typescript
// 1. Verificar autenticação
const user = parseSessionToken(session)
if (!user) return 401

// 2. Validar valor
if (!valor || Number.isNaN(Number(valor))) {
  return { error: 'Valor inválido' }, 400
}

const valorDigitado = Number(valor)
```

#### 2. Validação de Extração (Apostas Normais)

```typescript
// Verificar se extração pode ser usada hoje
if (loteria && !isInstant) {
  const extracaoId = /^\d+$/.test(loteria) ? parseInt(loteria, 10) : null
  const nomeLoteria = extracaoId ? null : loteria
  const dataConcursoDate = dataConcurso ? new Date(dataConcurso) : null

  const validacao = validarExtracaoParaAposta(
    extracaoId,
    nomeLoteria,
    horario || null,
    dataConcursoDate
  )

  if (!validacao.isValid) {
    return NextResponse.json(
      { error: validacao.errorMessage || 'Extração inválida' },
      { status: 400 }
    )
  }
}
```

**Função `validarExtracaoParaAposta()` (`lib/extracao-helpers.ts`):**
- Verifica se extração existe
- Verifica se está ativa
- Verifica se pode usar hoje (`podeUsarHoje()`)
- Verifica horário real de apuração (`getHorarioRealApuracao()` e `temSorteioNoDia()`)

**Função `podeUsarHoje()` (`lib/extracao-helpers.ts`):**
```typescript
function podeUsarHoje(days: string): boolean {
  if (!days || days === '—' || days === 'Todos') return true
  
  const hoje = new Date()
  const diaSemana = hoje.getDay() // 0=Domingo, 1=Segunda, ..., 6=Sábado
  
  const diasMap: Record<string, number> = {
    'dom': 0, 'domingo': 0,
    'seg': 1, 'segunda': 1,
    'ter': 2, 'terça': 2,
    'qua': 3, 'quarta': 3,
    'qui': 4, 'quinta': 4,
    'sex': 5, 'sexta': 5,
    'sáb': 6, 'sábado': 6,
  }
  
  const diasLower = days.toLowerCase().trim()
  const diasArray = diasLower.split(/[,;]/).map(d => d.trim())
  
  return diasArray.some(dia => {
    const diaNum = diasMap[dia]
    return diaNum !== undefined && diaNum === diaSemana
  })
}
```

#### 3. Cálculo de Valor Total

```typescript
// Calcular valor total baseado na divisão
let valorTotalAposta = valorDigitado

if (detalhes?.betData) {
  const betData = detalhes.betData
  const qtdPalpites = betData.animalBets?.length || betData.numberBets?.length || 0
  const divisionType = betData.divisionType || 'all'
  
  valorTotalAposta = calcularValorTotalAposta(
    valorDigitado,
    qtdPalpites,
    divisionType
  )
}

// Função calcularValorTotalAposta:
// - divisionType === 'each': valorTotal = valorDigitado × qtdPalpites
// - divisionType === 'all': valorTotal = valorDigitado
```

#### 4. Validação de Saldo

```typescript
const usuario = await prisma.usuario.findUnique({ where: { id: user.id } })

const bonusDisponivel = useBonusFlag && usuario.bonus > 0 
  ? usuario.bonus 
  : 0
const saldoDisponivel = usuario.saldo
const totalDisponivel = saldoDisponivel + bonusDisponivel

if (valorTotalAposta > totalDisponivel) {
  throw new Error('Saldo insuficiente')
}
```

#### 5. Débito de Saldo/Bônus

```typescript
// Estratégia: Debita primeiro do saldo, depois do bônus
let debitarBonus = 0
let debitarSaldo = Math.min(saldoDisponivel, valorTotalAposta)
const restante = valorTotalAposta - debitarSaldo

if (restante > 0) {
  if (bonusDisponivel <= 0) {
    throw new Error('Saldo insuficiente (bônus indisponível)')
  }
  debitarBonus = restante
}
```

#### 6. Processamento de Aposta Instantânea

```typescript
if (isInstant && detalhes?.betData) {
  const betData = detalhes.betData
  
  // 1. Mapear modalidade
  const modalityMap: Record<string, ModalityType> = {
    'Grupo': 'GRUPO',
    'Dupla de Grupo': 'DUPLA_GRUPO',
    // ... outras modalidades
  }
  
  const modalityType = modalityMap[betData.modalityName || ''] || 'GRUPO'
  
  // 2. Parsear posição usando função auxiliar
  const positionToUse = betData.customPosition && betData.customPositionValue
    ? betData.customPositionValue.trim()
    : betData.position
  
  const { pos_from, pos_to } = parsePosition(positionToUse)
  
  // 3. Gerar resultado instantâneo
  const resultadoInstantaneo = gerarResultadoInstantaneo(Math.max(pos_to, 7))
  
  // 4. Calcular valor por palpite
  const qtdPalpites = betData.animalBets.length || betData.numberBets?.length || 0
  const valorPorPalpite = calcularValorPorPalpite(
    betData.amount,
    qtdPalpites,
    betData.divisionType
  )
  
  // 5. Conferir cada palpite
  let premioTotal = 0
  
  if (betData.numberBets?.length > 0) {
    // Modalidades numéricas
    for (const numero of betData.numberBets) {
      const conferencia = conferirPalpite(
        resultadoInstantaneo,
        modalityType,
        { numero },
        pos_from,
        pos_to,
        valorPorPalpite,
        betData.divisionType
      )
      premioTotal += conferencia.totalPrize
    }
  } else {
    // Modalidades de grupo
    for (const animalBet of betData.animalBets) {
      const grupos = animalBet.map((animalId) => {
        const animal = ANIMALS.find(a => a.id === animalId)
        return animal.group
      })
      
      const conferencia = conferirPalpite(
        resultadoInstantaneo,
        modalityType,
        { grupos },
        pos_from,
        pos_to,
        valorPorPalpite,
        betData.divisionType
      )
      premioTotal += conferencia.totalPrize
    }
  }
  
  // 6. Atualizar saldo (debita e credita na mesma transação)
  const saldoFinal = usuario.saldo - debitarSaldo + premioTotal
  const bonusFinal = usuario.bonus - debitarBonus
  
  await tx.usuario.update({
    where: { id: user.id },
    data: {
      saldo: saldoFinal,
      bonus: bonusFinal,
      rolloverAtual: usuario.rolloverAtual + valorTotalAposta,
    },
  })
}
```

#### 7. Determinação de Status

```typescript
let statusFinal: string

if (isInstant) {
  // Aposta instantânea: liquidado se ganhou, perdida se não ganhou
  statusFinal = premioTotal > 0 ? 'liquidado' : 'perdida'
} else {
  // Aposta normal: pendente até ser liquidada pelo cron
  statusFinal = status || 'pendente'
}
```

#### 8. Salvamento da Aposta

```typescript
const created = await tx.aposta.create({
  data: {
    usuarioId: user.id,
    concurso: concurso || null,
    loteria: loteria || null,
    estado: estado || null,
    horario: horario || null,
    dataConcurso: dataConcurso ? new Date(dataConcurso) : null,
    modalidade: modalidade || null,
    aposta: aposta || null,
    valor: valorTotalAposta,
    retornoPrevisto: premioTotal > 0 ? premioTotal : (retornoPrevisto || 0),
    status: statusFinal,
    detalhes: {
      ...detalhes,
      resultadoInstantaneo: resultadoInstantaneo,
      premioTotal,
      valorDigitado,
      valorTotalAposta,
    },
  },
})
```

---

## 🔄 Sistema de Liquidação

### Fluxo Completo de Liquidação

**Arquivo:** `app/api/resultados/liquidar/route.ts`

#### 1. Buscar Apostas Pendentes

```typescript
const apostasPendentes = await prisma.aposta.findMany({
  where: { status: 'pendente' },
  include: { usuario: true },
  orderBy: { createdAt: 'asc' },
})
```

#### 2. Buscar Resultados

```typescript
// Tentar API interna primeiro
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
const resultadosResponse = await fetch(`${baseUrl}/api/resultados`, {
  cache: 'no-store',
  signal: AbortSignal.timeout(30000)
})

if (!resultadosResponse.ok) {
  // Fallback para API externa
  const fallbackResponse = await fetch(API_EXTERNA, {
    signal: AbortSignal.timeout(30000)
  })
  // ... processar resultados externos ...
}

const resultados = await resultadosResponse.json()
```

#### 3. Processar Cada Aposta

```typescript
for (const aposta of apostasPendentes) {
  try {
    // 3.1. Verificar horário de apuração usando horários reais
    if (aposta.loteria && aposta.dataConcurso) {
      const podeLiquidar = jaPassouHorarioApuracao(
        aposta.loteria,
        aposta.dataConcurso,
        aposta.horario || undefined
      )
      
      if (!podeLiquidar) {
        console.log(`⏸️  Pulando aposta ${aposta.id} - aguardando apuração`)
        continue
      }
    }
    
    // 3.2. Filtrar resultados por loteria (usando match flexível)
    let resultadosFiltrados = resultados
    
    if (aposta.loteria) {
      resultadosFiltrados = resultadosFiltrados.filter((r) => {
        if (!r.loteria) return false
        return matchExtracao(r.loteria, aposta.loteria)
      })
    }
    
    // 3.3. Filtrar por horário
    if (aposta.horario) {
      resultadosFiltrados = resultadosFiltrados.filter((r) => r.horario === aposta.horario)
    }
    
    // 3.4. Filtrar por data (normalizando formatos)
    if (aposta.dataConcurso) {
      const dataAposta = aposta.dataConcurso.toISOString().split('T')[0]
      const [anoAposta, mesAposta, diaAposta] = dataAposta.split('-')
      const dataApostaFormatada = `${diaAposta}/${mesAposta}/${anoAposta}`
      
      resultadosFiltrados = resultadosFiltrados.filter((r) => {
        const dataResultado = r.date || r.dataExtracao || ''
        
        // Comparar formato ISO
        if (dataResultado.split('T')[0] === dataAposta) return true
        
        // Comparar formato brasileiro
        if (dataResultado === dataApostaFormatada) return true
        
        // Comparação parcial
        const matchBR = dataResultado.match(/(\d{2})\/(\d{2})\/(\d{4})/)
        if (matchBR) {
          const [_, dia, mes, ano] = matchBR
          if (`${ano}-${mes}-${dia}` === dataAposta) return true
        }
        
        return false
      })
    }
    
    // 3.5. Ordenar resultados por posição
    const resultadosOrdenados = resultadosFiltrados
      .filter((r) => r.position && r.milhar)
      .sort((a, b) => {
        const getPosNumber = (pos?: string): number => {
          if (!pos) return 999
          const match = pos.match(/(\d+)/)
          return match ? parseInt(match[1], 10) : 999
        }
        return getPosNumber(a.position) - getPosNumber(b.position)
      })
      .slice(0, 7) // Limitar a 7 prêmios
    
    // 3.6. Extrair prêmios e grupos
    const milhares = resultadosOrdenados.map((r) => {
      const milharStr = (r.milhar || '0000').replace(/\D/g, '')
      return parseInt(milharStr.padStart(4, '0').slice(-4))
    })
    
    const grupos = milhares.map((m) => {
      const dezena = m % 100
      if (dezena === 0) return 25
      return Math.floor((dezena - 1) / 4) + 1
    })
    
    const resultadoOficial: InstantResult = {
      prizes: milhares,
      groups: grupos,
    }
    
    // 3.7. Conferir apostas
    const betData = aposta.detalhes?.betData
    if (!betData) continue
    
    let premioTotal = 0
    
    // Conferir cada palpite usando bet-rules-engine
    for (const animalBet of betData.animalBets) {
      const gruposApostados = animalBet.map((animalId) => {
        const animal = ANIMALS.find((a) => a.id === animalId)
        return animal.group
      })
      
      const { pos_from, pos_to } = parsePosition(betData.position)
      
      const conferencia = conferirPalpite(
        resultadoOficial,
        modalityType,
        { grupos: gruposApostados },
        pos_from,
        pos_to,
        valorPorPalpite,
        betData.divisionType
      )
      
      premioTotal += conferencia.totalPrize
    }
    
    // 3.8. Atualizar aposta e saldo
    await prisma.$transaction(async (tx) => {
      // Atualizar aposta
      await tx.aposta.update({
        where: { id: aposta.id },
        data: {
          status: premioTotal > 0 ? 'liquidado' : 'perdida',
          retornoPrevisto: premioTotal,
          detalhes: {
            ...aposta.detalhes,
            premioTotal,
            resultadoUsado: resultadoOficial,
          },
        },
      })
      
      // Atualizar saldo do usuário
      if (premioTotal > 0) {
        await tx.usuario.update({
          where: { id: aposta.usuarioId },
          data: {
            saldo: {
              increment: premioTotal,
            },
          },
        })
      }
    })
    
    liquidadas++
    premioTotalGeral += premioTotal
    
  } catch (error) {
    console.error(`Erro ao liquidar aposta ${aposta.id}:`, error)
  }
}
```

### Verificação de Horário de Apuração

**Função:** `jaPassouHorarioApuracao()`

```typescript
function jaPassouHorarioApuracao(
  nomeLoteria: string | null,
  dataConcurso: Date | null,
  horario?: string | null
): boolean {
  if (!nomeLoteria || !dataConcurso) return true
  
  // Buscar extração pelo nome e horário
  const extracao = buscarExtracaoPorNomeEHorario(nomeLoteria, horario || undefined)
  if (!extracao) return true
  
  // Buscar horário real de apuração
  const horarioExtracao = horario || extracao.time || ''
  const horarioReal = getHorarioRealApuracao(extracao.name, horarioExtracao)
  
  if (!horarioReal) {
    // Fallback para closeTime da extração
    // ... lógica de fallback ...
  }
  
  // Verificar dia da semana
  const diaSemana = dataConcurso.getDay()
  if (!temSorteioNoDia(horarioReal, diaSemana)) {
    return false
  }
  
  // Obter horário atual em Brasília
  const agoraUTC = new Date()
  const agoraBrasiliaStr = agoraUTC.toLocaleString('en-US', {
    timeZone: 'America/Sao_Paulo',
    // ... formatação ...
  })
  
  // Criar data/hora de apuração inicial
  const [horas, minutos] = horarioReal.startTimeReal.split(':').map(Number)
  const dataApuracaoInicial = new Date(
    dataConcurso.getFullYear(),
    dataConcurso.getMonth(),
    dataConcurso.getDate(),
    horas, minutos, 0
  )
  
  // Comparar datas
  // Se mesmo dia: verificar se já passou o horário inicial
  // Se dia passado: já pode liquidar
  // Se dia futuro: não pode liquidar ainda
}
```

---

## 📊 Sistema de Resultados

### Busca de Resultados

**Arquivo:** `app/api/resultados/route.ts`

#### 1. Buscar da API Externa

```typescript
const RAW_SOURCE = process.env.BICHO_CERTO_API || 'https://...'
const SOURCE_ROOT = RAW_SOURCE.replace(/\/api\/resultados$/, '')

// Buscar resultados organizados
const res = await fetchWithTimeout(
  `${SOURCE_ROOT}/api/resultados/organizados`,
  30000 // 30 segundos timeout
)

const data = await res.json()
const organizados = data?.organizados || {}
```

#### 2. Processar e Normalizar

```typescript
let results: ResultadoItem[] = []

// Estatísticas para logs detalhados
const extracaoStats: Record<string, { horarios: Set<string>, total: number }> = {}
let totalHorarios = 0

Object.entries(organizados).forEach(([tabela, horarios]) => {
  Object.entries(horarios as Record<string, any[]>).forEach(([horario, lista]) => {
    // Processar cada resultado
    const arr = lista.map((item: any) => ({
      position: item.colocacao || `${item.posicao || idx + 1}°`,
      milhar: item.numero || item.milhar || '',
      grupo: item.grupo || '',
      loteria: tabela,
      horario,
      date: item.data_extracao || item.dataExtracao || item.data || item.date || '',
      // ... outros campos ...
    }))
    
    extracaoStats[tabela].total += arr.length
    results = results.concat(arr)
  })
})

// Logs detalhados
console.log(`📊 Total processado: ${Object.keys(extracaoStats).length} extrações, ${totalHorarios} horários, ${results.length} resultados`)
Object.entries(extracaoStats).forEach(([nome, stats]) => {
  const horariosList = Array.from(stats.horarios).sort().join(', ')
  console.log(`📊 Extração "${nome}": ${stats.horarios.size} horário(s) - ${horariosList}`)
})
```

#### 3. Agrupar Resultados

```typescript
// Agrupar por loteria|horário|data
const grouped: Record<string, ResultadoItem[]> = {}

results.forEach((r) => {
  const key = `${r.loteria || ''}|${r.drawTime || ''}|${r.date || ''}`
  grouped[key] = grouped[key] || []
  grouped[key].push(r)
})

const gruposUnicos = Object.keys(grouped)
console.log(`✅ Resultados finais: ${gruposUnicos.length} grupos únicos`)

// Ordenar e limitar em 7 posições por sorteio
results = Object.values(grouped)
  .map((arr) => orderByPosition(arr).slice(0, 7))
  .flat()
```

---

## 📐 Regras de Negócio

### 1. Validação de Dias de Sorteio

**Regra:** Cada extração tem dias específicos de sorteio.

**Implementação:**
- Campo `days` na extração (ex: "Qua, Sáb", "Todos")
- Função `podeUsarHoje()` verifica se hoje é um dia válido
- Função `temSorteioNoDia()` verifica usando horários reais

### 2. Validação de Horários

**Regra:** Apostas só podem ser feitas antes do horário de fechamento.

**Implementação:**
- Campo `realCloseTime` na extração
- Frontend desabilita apostas após `realCloseTime`
- Backend valida antes de criar aposta

### 3. Divisão de Valores

**Regra:** Valor pode ser dividido "para cada" ou "para todos".

**Implementação:**
- `divisionType: 'each'`: valor digitado é por palpite
- `divisionType: 'all'`: valor digitado é total, dividido igualmente

### 4. Débito de Saldo/Bônus

**Regra:** Debita primeiro do saldo, depois do bônus.

**Implementação:**
```typescript
let debitarSaldo = Math.min(saldoDisponivel, valorTotalAposta)
const restante = valorTotalAposta - debitarSaldo
let debitarBonus = restante > 0 ? restante : 0
```

### 5. Rollover

**Regra:** Bônus precisa de rollover para ser liberado.

**Implementação:**
- Campo `rolloverAtual` incrementa a cada aposta
- Campo `rolloverNecessario` define quanto precisa apostar
- Quando `rolloverAtual >= rolloverNecessario`, bônus é liberado

---

## 💰 Cálculos e Prêmios

### Motor de Regras

**Arquivo:** `lib/bet-rules-engine.ts`

#### 1. Cálculo de Unidades

```typescript
function calcularUnidades(
  qtdCombinacoes: number,
  pos_from: number,
  pos_to: number
): number {
  const qtdPosicoes = pos_to - pos_from + 1
  return qtdCombinacoes * qtdPosicoes
}
```

#### 2. Cálculo de Valor Unitário

```typescript
function calcularValorUnitario(
  valorPorPalpite: number,
  unidades: number
): number {
  if (unidades === 0) return 0
  return valorPorPalpite / unidades
}
```

#### 3. Busca de Odd (Multiplicador)

```typescript
function buscarOdd(
  modalidade: ModalityType,
  pos_from: number,
  pos_to: number,
  modalityName?: string
): number {
  // Tentar cotação dinâmica primeiro
  if (modalityName) {
    const cotacaoDinamica = buscarCotacaoDinamica(modalityName)
    if (cotacaoDinamica !== null) {
      return cotacaoDinamica
    }
  }
  
  // Usar tabela fixa
  const posKey = `${pos_from}-${pos_to}`
  const oddsTable: Record<string, Record<string, number>> = {
    GRUPO: { '1-1': 18, '1-3': 18, '1-5': 18, '1-7': 18 },
    DUPLA_GRUPO: { '1-1': 180, '1-3': 180, '1-5': 180, '1-7': 180 },
    // ... outras modalidades
  }
  
  return oddsTable[modalidade]?.[posKey] || 0
}
```

---

## ✅ Validações

### Validações de Aposta

1. **Autenticação:** Usuário deve estar autenticado
2. **Valor:** Valor deve ser válido e numérico
3. **Saldo:** Saldo + bônus deve ser suficiente
4. **Extração:** Extração deve existir e estar ativa
5. **Dias de Sorteio:** Extração deve ter sorteio hoje
6. **Horário Real:** Horário deve ter sorteio no dia escolhido
7. **Posição:** Posição deve ser válida para a modalidade
8. **Palpites:** Deve ter pelo menos 1 palpite

### Validações de Liquidação

1. **Horário de Apuração:** Deve ter passado o horário inicial
2. **Dia da Semana:** Deve ter sorteio no dia do concurso
3. **Resultados:** Deve encontrar resultados para loteria/horário/data
4. **Match de Horário:** Deve fazer match com horário da aposta

---

## 🗄️ Estrutura de Dados

### Modelos Prisma

**Usuario:**
```prisma
model Usuario {
  id                Int       @id @default(autoincrement())
  nome              String
  email             String    @unique
  telefone          String?
  passwordHash      String?
  saldo             Float     @default(0)
  bonus             Float     @default(0)
  bonusBloqueado    Float     @default(0)
  rolloverNecessario Float    @default(0)
  rolloverAtual     Float     @default(0)
  bonusSemanal      Int       @default(0)
  isAdmin           Boolean   @default(false)
  ativo             Boolean   @default(true)
  apostas           Aposta[]
  saques            Saque[]
  transacoes        Transacao[]
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}
```

**Aposta:**
```prisma
model Aposta {
  id              Int       @id @default(autoincrement())
  usuarioId       Int
  concurso        String?
  loteria         String?
  estado          String?
  horario         String?
  dataConcurso    DateTime?
  modalidade      String?
  aposta          String?
  valor           Float     @default(0)
  retornoPrevisto Float     @default(0)
  status          String    @default("pendente")
  detalhes        Json?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  usuario Usuario @relation(fields: [usuarioId], references: [id])
  
  @@index([usuarioId])
}
```

**Campo `detalhes` (JSON):**
```typescript
{
  betData: {
    modality: string
    modalityName: string
    animalBets: number[][]  // Array de arrays de IDs de animais
    numberBets?: string[]    // Array de números (para modalidades numéricas)
    position: string         // "1st", "1-3", "1-5", "1-7"
    customPosition?: boolean
    customPositionValue?: string
    amount: number           // Valor digitado
    divisionType: 'all' | 'each'
    instant?: boolean         // true se for aposta instantânea
  },
  resultadoInstantaneo?: {
    prizes: number[]         // Milhares sorteados
    groups: number[]         // Grupos correspondentes
  },
  premioTotal?: number
  valorDigitado?: number
  valorTotalAposta?: number
  resultadoUsado?: {         // Resultado usado na liquidação
    prizes: number[]
    groups: number[]
  }
}
```

### Dados Estáticos

**Extrações:** `data/extracoes.ts`
```typescript
interface Extracao {
  id: number
  name: string
  estado?: string
  realCloseTime?: string
  closeTime: string
  time: string
  active: boolean
  max: number
  days: string  // "Qua, Sáb", "Todos", etc.
}
```

**Horários Reais:** `data/horarios-reais-apuracao.ts`
```typescript
interface HorarioRealApuracao {
  name: string
  time: string
  startTimeReal: string
  closeTimeReal: string
  diasSemSorteio?: number[]  // [0=Domingo, ..., 6=Sábado]
}
```

**Animais:** `data/animals.ts`
```typescript
interface Animal {
  id: number
  name: string
  group: number  // 1-25
  emoji: string
}
```

---

## 🌐 APIs Principais

### 1. POST /api/apostas

**Criar nova aposta**

**Request:**
```json
{
  "loteria": "1",
  "horario": "09:20",
  "dataConcurso": "2026-01-15",
  "modalidade": "Dupla de Grupo",
  "valor": 10.00,
  "detalhes": {
    "betData": {
      "modality": "Dupla de Grupo",
      "modalityName": "Dupla de Grupo",
      "animalBets": [[1, 6]],
      "position": "1-5",
      "amount": 10.00,
      "divisionType": "all",
      "instant": false
    }
  }
}
```

**Response:**
```json
{
  "aposta": {
    "id": 123,
    "usuarioId": 1,
    "loteria": "1",
    "valor": 10.00,
    "status": "pendente",
    "detalhes": { ... }
  }
}
```

### 2. GET /api/apostas

**Listar apostas do usuário**

**Response:**
```json
{
  "user": { "id": 1, "email": "...", "nome": "..." },
  "apostas": [...],
  "total": 10
}
```

### 3. POST /api/resultados/liquidar

**Liquidar apostas pendentes**

**Response:**
```json
{
  "message": "Liquidação concluída",
  "processadas": 10,
  "liquidadas": 8,
  "premioTotal": 1500.00
}
```

### 4. GET /api/resultados

**Buscar resultados**

**Query Params:**
- `dateFilter`: Filtro de data (opcional)
- `locationFilter`: Filtro de localização (opcional)
- `uf`: Filtro de UF (opcional)

**Response:**
```json
{
  "resultados": [
    {
      "loteria": "PT RIO",
      "horario": "09:20",
      "date": "2026-01-15",
      "position": 1,
      "milhar": 1234,
      "grupo": 9,
      "drawTime": "09:20"
    }
  ]
}
```

---

## 🔄 Fluxos Completos

### Fluxo 1: Criar Aposta Normal

```
1. Usuário preenche formulário
   ↓
2. Frontend valida campos
   ↓
3. POST /api/apostas
   ↓
4. Backend valida autenticação
   ↓
5. Backend valida extração (dias, horário)
   ↓
6. Backend calcula valor total
   ↓
7. Backend valida saldo
   ↓
8. Backend debita saldo/bônus
   ↓
9. Backend cria aposta com status "pendente"
   ↓
10. Retorna aposta criada
```

### Fluxo 2: Criar Aposta Instantânea

```
1. Usuário marca "INSTANTANEA"
   ↓
2. POST /api/apostas (com instant: true)
   ↓
3. Backend valida autenticação
   ↓
4. Backend calcula valor total
   ↓
5. Backend valida saldo
   ↓
6. Backend gera resultado instantâneo
   ↓
7. Backend confere cada palpite
   ↓
8. Backend calcula prêmio total
   ↓
9. Backend debita saldo e credita prêmio
   ↓
10. Backend cria aposta com status "liquidado" ou "perdida"
   ↓
11. Retorna aposta com resultado instantâneo
```

### Fluxo 3: Liquidação de Apostas

```
1. Cron job chama POST /api/resultados/liquidar
   ↓
2. Backend busca apostas pendentes
   ↓
3. Backend busca resultados da API
   ↓
4. Para cada aposta:
   a. Verifica horário de apuração (usando horários reais)
   b. Filtra resultados por loteria (match flexível)
   c. Filtra resultados por horário
   d. Filtra resultados por data
   e. Ordena resultados por posição
   f. Extrai prêmios
   g. Confere palpites
   h. Calcula prêmio total
   i. Atualiza aposta e saldo
   ↓
5. Retorna estatísticas
```

---

## 📝 Resumo das Funções Principais

### Autenticação (`lib/auth.ts`)
- `hashPassword()` - Hash de senha
- `createSessionToken()` - Criar token de sessão
- `parseSessionToken()` - Parsear token de sessão

### Extrações (`lib/extracao-helpers.ts`)
- `podeUsarHoje()` - Verificar se extração pode ser usada hoje
- `buscarExtracaoPorId()` - Buscar extração por ID
- `buscarExtracaoPorNomeEHorario()` - Buscar extração por nome e horário
- `validarExtracaoParaAposta()` - Validar extração para aposta

### Horários Reais (`data/horarios-reais-apuracao.ts`)
- `getHorarioRealApuracao()` - Buscar horário real de apuração
- `temSorteioNoDia()` - Verificar se tem sorteio no dia

### Posições (`lib/position-parser.ts`)
- `parsePosition()` - Parsear posição
- `validarPosicaoParaModalidade()` - Validar posição
- `formatarPosicao()` - Formatar posição

### Apostas (`app/api/apostas/route.ts`)
- `POST /api/apostas` - Criar aposta
- `GET /api/apostas` - Listar apostas

### Liquidação (`app/api/resultados/liquidar/route.ts`)
- `jaPassouHorarioApuracao()` - Verificar horário de apuração
- `matchExtracao()` - Match flexível de nomes
- `POST /api/resultados/liquidar` - Liquidar apostas

### Resultados (`app/api/resultados/route.ts`)
- `inferUfFromName()` - Inferir UF do nome
- `normalizeResults()` - Normalizar resultados
- `GET /api/resultados` - Buscar resultados

### Regras (`lib/bet-rules-engine.ts`)
- `conferirPalpite()` - Conferir palpite completo
- `calcularUnidades()` - Calcular unidades
- `buscarOdd()` - Buscar multiplicador
- `gerarResultadoInstantaneo()` - Gerar resultado instantâneo

---

## 🔗 Referências

- **Regras Completas:** `/docs/REGRAS_COMPLETAS_MODALIDADES.md`
- **Soluções de Liquidação:** `/docs/TROUBLESHOOTING.md`
- **Guia de Implementação:** `/docs/GUIA_IMPLEMENTACAO_LIQUIDACAO.md`
- **Apostas Instantâneas:** `/docs/GUIA_APOSTA_INSTANTANEA.md`

---

**Última atualização:** 15 de Janeiro de 2026
