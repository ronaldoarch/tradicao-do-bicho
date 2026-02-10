# Análise de Pontos Fracos e Problemas de Escalabilidade

## 🔴 CRÍTICOS - Podem quebrar em produção

### 1. **Queries sem limite/paginação**

#### Problema: `app/api/resultados/liquidar/route.ts:183`
```typescript
const apostasPendentes = await prisma.aposta.findMany({
  where: whereClause,
  // ❌ SEM LIMITE - pode carregar milhares de apostas na memória
})
```

**Impacto:** Com muitos usuários, pode carregar dezenas de milhares de apostas pendentes, causando:
- Timeout da requisição
- Consumo excessivo de memória
- Lento processamento

**Solução:**
```typescript
const apostasPendentes = await prisma.aposta.findMany({
  where: whereClause,
  take: 1000, // Processar em lotes
  orderBy: { createdAt: 'asc' },
  // Adicionar cursor para paginação
})
```

#### Problema: `app/api/admin/saques/route.ts:33`
```typescript
const saquesDb = await prisma.saque.findMany({
  orderBy: { createdAt: 'desc' },
  // ❌ SEM LIMITE
})
```

**Solução:** Adicionar `take: 100` ou implementar paginação

#### Problema: `app/api/admin/usuarios/route.ts:8`
```typescript
const usuarios = await prisma.usuario.findMany({
  orderBy: { id: 'desc' },
  // ❌ SEM LIMITE
})
```

**Solução:** Implementar paginação com `skip` e `take`

---

### 2. **Falta de timeout em chamadas fetch**

#### Problema: `lib/frk-api-client.ts`
Múltiplas chamadas `fetch()` sem timeout:
- Linha 236: Autenticação
- Linha 410: Descarga
- Linha 571: Buscar extrações
- Linha 634: Buscar resultados

**Impacto:** Se a API FRK estiver lenta/indisponível, a requisição pode travar indefinidamente.

**Solução:**
```typescript
const response = await fetch(url, {
  method: 'POST',
  headers: { ... },
  body: JSON.stringify(body),
  signal: AbortSignal.timeout(30000), // 30 segundos
})
```

#### Problema: `lib/agenciamidas-api.ts:354`
```typescript
const response = await fetch(url, {
  method: 'GET',
  // ❌ SEM TIMEOUT
})
```

**Solução:** Adicionar `signal: AbortSignal.timeout(30000)`

---

### 3. **Processamento sequencial em loops**

#### Problema: `app/api/resultados/liquidar/route.ts:356`
```typescript
// Processar cada aposta
for (const aposta of apostasPendentes) {
  // ... processamento ...
  await prisma.$transaction(async (tx) => {
    // ❌ Processa uma aposta por vez
  })
}
```

**Impacto:** Com 1000 apostas, se cada uma levar 100ms, total = 100 segundos.

**Solução:** Processar em lotes paralelos:
```typescript
const BATCH_SIZE = 50
for (let i = 0; i < apostasPendentes.length; i += BATCH_SIZE) {
  const batch = apostasPendentes.slice(i, i + BATCH_SIZE)
  await Promise.all(batch.map(aposta => processarAposta(aposta)))
}
```

---

### 4. **Race conditions em atualizações de saldo**

#### Problema: `app/api/apostas/route.ts:210`
```typescript
const result = await prisma.$transaction(async (tx) => {
  const usuario = await tx.usuario.findUnique({ where: { id: user.id } })
  // ... cálculos ...
  await tx.usuario.update({
    where: { id: user.id },
    data: { saldo: saldoFinal } // ❌ Pode haver race condition
  })
})
```

**Impacto:** Se usuário fizer múltiplas apostas simultaneamente, pode haver saldo negativo.

**Solução:** Usar `increment/decrement` ou `updateMany` com condição:
```typescript
await tx.usuario.updateMany({
  where: { 
    id: user.id,
    saldo: { gte: valorNum } // Verifica saldo antes de atualizar
  },
  data: { 
    saldo: { decrement: valorNum }
  }
})
```

#### Problema: `app/api/resultados/liquidar/route.ts:716`
```typescript
await tx.usuario.update({
  where: { id: aposta.usuarioId },
  data: {
    saldo: { increment: premioTotalAposta }, // ✅ Usa increment (bom)
  },
})
```
**Status:** ✅ Já está usando `increment` - correto!

---

### 5. **Cache em memória sem controle de tamanho**

#### Problema: `app/api/resultados/route.ts:242`
```typescript
const cache = new Map<string, { results: ResultadoItem[], expires: number }>()
// ❌ Map cresce indefinidamente - pode causar memory leak
```

**Impacto:** Com muitos filtros diferentes, o cache pode crescer sem limite.

**Solução:** Implementar LRU cache ou limpar cache periodicamente:
```typescript
// Limpar cache expirado periodicamente
if (cache.size > 1000) {
  const now = Date.now()
  for (const [key, value] of cache.entries()) {
    if (now > value.expires) {
      cache.delete(key)
    }
  }
}
```

---

### 6. **Falta de retry logic em APIs externas**

#### Problema: `lib/agenciamidas-api.ts`
Chamadas à API sem retry em caso de falha temporária.

**Impacto:** Falhas temporárias de rede causam erros desnecessários.

**Solução:** Implementar retry com exponential backoff:
```typescript
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(30000),
      })
      if (response.ok) return response
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
    }
  }
}
```

---

## 🟡 MÉDIOS - Podem causar problemas em escala

### 7. **Busca de resultados sem limite de loterias**

#### Problema: `app/api/resultados/route.ts:288`
```typescript
const promessasBusca = loteriasParaBuscar.map((loteriaNome) => buscarLoteria(loteriaNome))
// ❌ Pode fazer dezenas de chamadas HTTP simultâneas
```

**Impacto:** Com muitas loterias, pode sobrecarregar a API externa ou causar timeout.

**Solução:** Limitar concorrência:
```typescript
async function processInBatches<T>(items: T[], batchSize: number, fn: (item: T) => Promise<any>) {
  const results = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(fn))
    results.push(...batchResults)
  }
  return results
}
```

---

### 8. **Falta de validação de tamanho de payload**

#### Problema: `app/api/apostas/route.ts:115`
Não há validação do tamanho do body antes de processar.

**Impacto:** Usuário malicioso pode enviar payload gigante causando DoS.

**Solução:**
```typescript
const MAX_BODY_SIZE = 1024 * 1024 // 1MB
const contentLength = request.headers.get('content-length')
if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
  return NextResponse.json({ error: 'Payload muito grande' }, { status: 413 })
}
```

---

### 9. **Logs excessivos em produção**

#### Problema: Múltiplos arquivos
```typescript
console.log('📤 Enviando descarga para FRK:', { ... })
console.log('📥 Resposta completa:', responseText.substring(0, 500))
// ❌ Logs detalhados em produção podem causar:
// - I/O excessivo
// - Custo alto em serviços de log
// - Exposição de dados sensíveis
```

**Solução:** Usar níveis de log:
```typescript
const LOG_LEVEL = process.env.LOG_LEVEL || 'info'
if (LOG_LEVEL === 'debug') {
  console.log('📤 Enviando descarga:', { ... })
}
```

---

### 10. **Falta de rate limiting**

#### Problema: Nenhum endpoint tem rate limiting

**Impacto:** Usuários podem fazer spam de requisições causando DoS.

**Solução:** Implementar rate limiting (ex: `@upstash/ratelimit`):
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
})

const { success } = await ratelimit.limit(userId)
if (!success) {
  return NextResponse.json({ error: 'Muitas requisições' }, { status: 429 })
}
```

---

### 11. **Transações muito longas**

#### Problema: `app/api/apostas/route.ts:210`
Transação pode demorar muito se houver processamento complexo dentro.

**Impacto:** Pode causar deadlocks ou timeouts de transação.

**Solução:** Mover processamento pesado para fora da transação:
```typescript
// Processar fora da transação
const resultadoInstantaneo = gerarResultadoInstantaneo(...)
const premioTotal = calcularPremio(...)

// Transação apenas para operações críticas
await prisma.$transaction(async (tx) => {
  await tx.usuario.update(...)
  await tx.aposta.create(...)
})
```

---

### 12. **Falta de índices no banco**

#### Verificar: `prisma/schema.prisma`
Certificar que há índices em:
- `aposta.status` (para queries de liquidação)
- `aposta.usuarioId` (para listagem de apostas)
- `aposta.dataConcurso` (para filtros por data)
- `transacao.status` (para queries de dashboard)

**Solução:** Adicionar índices no schema:
```prisma
model Aposta {
  // ...
  @@index([status])
  @@index([usuarioId])
  @@index([dataConcurso])
  @@index([status, dataConcurso])
}
```

---

## 🟢 MELHORIAS - Boas práticas

### 13. **Falta de monitoramento/alertas**

**Solução:** Adicionar métricas:
- Tempo de resposta de APIs
- Taxa de erro
- Uso de memória
- Número de requisições simultâneas

### 14. **Falta de health checks**

**Solução:** Criar endpoint `/api/health`:
```typescript
export async function GET() {
  const dbHealthy = await prisma.$queryRaw`SELECT 1`.catch(() => null)
  return NextResponse.json({
    status: dbHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
  })
}
```

### 15. **Falta de circuit breaker**

**Solução:** Implementar circuit breaker para APIs externas:
```typescript
class CircuitBreaker {
  private failures = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      throw new Error('Circuit breaker is open')
    }
    try {
      const result = await fn()
      this.failures = 0
      this.state = 'closed'
      return result
    } catch (error) {
      this.failures++
      if (this.failures >= 5) {
        this.state = 'open'
        setTimeout(() => { this.state = 'half-open' }, 60000)
      }
      throw error
    }
  }
}
```

---

## 📊 Resumo de Prioridades

### 🔴 ALTA PRIORIDADE (Corrigir imediatamente)
1. ✅ Adicionar limites em queries `findMany`
2. ✅ Adicionar timeouts em todas as chamadas `fetch`
3. ✅ Processar liquidação em lotes paralelos
4. ✅ Usar `increment/decrement` ou validação em atualizações de saldo

### 🟡 MÉDIA PRIORIDADE (Corrigir em breve)
5. ✅ Implementar LRU cache ou limpeza periódica
6. ✅ Adicionar retry logic em APIs externas
7. ✅ Limitar concorrência em buscas paralelas
8. ✅ Adicionar rate limiting

### 🟢 BAIXA PRIORIDADE (Melhorias)
9. ✅ Adicionar índices no banco
10. ✅ Implementar health checks
11. ✅ Adicionar circuit breaker
12. ✅ Melhorar logging (níveis)
