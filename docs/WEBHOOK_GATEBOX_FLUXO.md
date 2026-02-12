# 🔄 Fluxo de Processamento do Webhook Gatebox

Este documento explica detalhadamente como o webhook da Gatebox processa depósitos (crédito de saldo) e saques.

---

## 📥 Recebimento do Webhook

**Endpoint:** `POST /api/webhooks/gatebox`

### 1. Registro Inicial

Quando o webhook chega:

```typescript
// 1. Recebe o payload JSON
const body = await req.json()

// 2. Registra o evento no banco (para auditoria)
const webhookEvent = await prisma.webhookEvent.create({
  data: {
    source: 'gatebox',
    eventType: body.type || body.eventType || body.status,
    payload: body,  // Payload completo salvo para debug
    headers: relevantHeaders,
    status: 'received',
  },
})
```

### 2. Extração de Dados

O sistema extrai informações do payload (que pode vir em diferentes formatos):

```typescript
// Identificadores da transação (busca em múltiplos lugares)
const transactionId = 
  body.transactionId ||
  body.transaction?.transactionId ||
  body.id ||
  body.idTransaction

const externalId = 
  body.externalId ||
  body.external_id ||
  body.invoice?.externalId ||
  body.transaction?.externalId

const endToEnd = 
  body.endToEnd ||
  body.end_to_end ||
  body.bankData?.endtoendId

// Status e tipo de evento
const status = body.status || body.transaction?.status
const eventType = (body.type || body.eventType || '').toUpperCase()
```

**Referências usadas para buscar transação/saque:**
```typescript
const refs = [transactionId, externalId, endToEnd].filter(Boolean)
```

---

## 💰 PROCESSAMENTO DE DEPÓSITOS (Crédito de Saldo)

### Fluxo de Crédito

```
Webhook recebido → Identificar como depósito → Buscar transação → Verificar se já foi processado → 
Calcular bônus → Creditar saldo → Aplicar bônus → Creditar promotor (se primeiro depósito)
```

### 1. Identificação de Depósito Pago

O sistema identifica um depósito pago através de:

**Por Event Type:**
```typescript
const isPaidByEvent = eventType === 'PIX_PAY_IN'
```

**Por Status:**
```typescript
const isPaidByStatus =
  statusLower === 'paid' ||
  statusLower === 'completed' ||
  statusLower === 'pago' ||
  statusLower === 'paid_out' ||
  body.paid === true ||
  body.completed === true

const isPaid = isPaidByEvent || isPaidByStatus
```

### 2. Busca da Transação

```typescript
const transacao = await prisma.transacao.findFirst({
  where: {
    OR: refs.map((r) => ({ referenciaExterna: r })),
    tipo: 'deposito',
  },
  include: { usuario: true },
})
```

**Busca por:**
- `transactionId`
- `externalId` (ex: `deposito_123_1234567890`)
- `endToEnd` (ID do PIX)

### 3. Verificação de Duplicidade

```typescript
if (transacao.status === 'pago') {
  return NextResponse.json({ message: 'Transação já processada' }, { status: 200 })
}
```

**Importante:** Evita crédito duplicado se o webhook for recebido múltiplas vezes.

### 4. Cálculo de Bônus

```typescript
// Conta depósitos anteriores do usuário
const depositosPagos = await prisma.transacao.count({
  where: { usuarioId: user.id, tipo: 'deposito', status: 'pago' },
})

// Busca promoções ativas
const promocoesAtivas = await prisma.promocao.findMany({
  where: { active: true },
  orderBy: { order: 'asc' },
})

// Calcula bônus usando sistema de promoções
const calculoBonus = calcularBonus(
  transacao.valor, 
  promocoesAtivas, 
  depositosPagos === 0  // É primeiro depósito?
)

let bonusAplicado = calculoBonus.bonus

// Fallback: se não aplicou promoção mas é primeiro depósito
if (bonusAplicado === 0 && depositosPagos === 0) {
  const bonusPercent = Number(process.env.BONUS_FIRST_DEPOSIT_PERCENT ?? 50)
  const bonusLimit = Number(process.env.BONUS_FIRST_DEPOSIT_LIMIT ?? 100)
  if (bonusPercent > 0) {
    const calc = (transacao.valor * bonusPercent) / 100
    bonusAplicado = Math.min(calc, bonusLimit)
  }
}
```

### 5. Crédito de Saldo

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Atualiza status da transação
  await tx.transacao.update({
    where: { id: transacao.id },
    data: {
      status: 'pago',
      bonusAplicado,
    },
  })

  // 2. Credita saldo do usuário
  await tx.usuario.update({
    where: { id: user.id },
    data: {
      // Saldo total (pode usar para apostas)
      saldo: { increment: transacao.valor },
      
      // Saldo sacável (dinheiro real que pode sacar)
      saldoSacavel: { increment: transacao.valor },
      
      // Bônus bloqueado (precisa fazer rollover para liberar)
      bonusBloqueado: bonusAplicado > 0 
        ? { increment: bonusAplicado } 
        : undefined,
      
      // Rollover necessário (quantidade que precisa apostar para liberar bônus)
      rolloverNecessario: bonusAplicado > 0 
        ? { increment: bonusAplicado * rolloverMult } 
        : undefined,
    },
  })
})
```

**Campos atualizados:**
- ✅ `saldo`: Incrementado com o valor do depósito
- ✅ `saldoSacavel`: Incrementado com o valor do depósito (dinheiro real)
- ✅ `bonusBloqueado`: Incrementado com o bônus (se houver)
- ✅ `rolloverNecessario`: Incrementado com o rollover necessário (padrão: 3x o bônus)

### 6. Bônus de Promotor

Se for o primeiro depósito do usuário indicado:

```typescript
if (depositosPagos === 0) {
  await creditarPromotorPrimeiroDeposito(user.id, transacao.valor)
}
```

---

## 💸 PROCESSAMENTO DE SAQUES

### Fluxo de Saque

```
Webhook recebido → Identificar como saque → Buscar saque → Verificar status → 
Atualizar status do saque (aprovado/rejeitado) → Se rejeitado: devolver saldo
```

### 1. Identificação de Saque Confirmado

**Event Types que indicam saque confirmado:**
```typescript
const isPayoutEvent =
  eventType === 'PIX_PAY_OUT' ||
  eventType === 'PAY_OUT' ||
  eventType === 'PIX_PAYMENT_EFFECTIVE' ||
  eventType === 'PIX_EFFECTIVE' ||
  statusLower === 'paid_out'

const isCompletedStatus = statusLower === 'completed'
```

**Busca por `externalId` com prefixo "saque-":**
```typescript
if (externalId && externalId.startsWith('saque-')) {
  // externalId = "saque-24" → extrai ID 24
  const saqueIdMatch = externalId.match(/^saque-(\d+)$/)
  if (saqueIdMatch) {
    const saqueId = parseInt(saqueIdMatch[1], 10)
    // Busca saque pelo ID
  }
}
```

### 2. Busca do Saque

**Método 1: Por referência externa**
```typescript
let saque = await prisma.saque.findFirst({
  where: {
    referenciaExterna: { in: refs },  // transactionId, externalId, endToEnd
    status: 'processando',
  },
})
```

**Método 2: Por ID do saque (se externalId = "saque-24")**
```typescript
if (!saque && externalId && externalId.startsWith('saque-')) {
  const saqueIdMatch = externalId.match(/^saque-(\d+)$/)
  if (saqueIdMatch) {
    const saqueId = parseInt(saqueIdMatch[1], 10)
    saque = await prisma.saque.findFirst({
      where: {
        id: saqueId,
        status: 'processando',
      },
    })
  }
}
```

### 3. Confirmação de Saque

```typescript
if (saque) {
  await prisma.saque.update({
    where: { id: saque.id },
    data: { status: 'aprovado' },
  })
  
  return NextResponse.json({ message: 'Saque confirmado' })
}
```

**Importante:** O saldo já foi debitado quando o saque foi solicitado. Aqui apenas atualiza o status.

---

## ❌ REVERSÃO DE SAQUE (Saque Falhou)

### Quando ocorre:

```typescript
const isReversalOut =
  eventType === 'PIX_REVERSAL_OUT' ||
  eventType === 'PAY_OUT_REVERSAL' ||
  (eventType === 'PIX_PAY_OUT' && 
   (statusLower === 'failed' || statusLower === 'reversed' || statusLower === 'rejeitado'))
```

### Processo de Reversão:

```typescript
if (isReversalOut) {
  // Busca saque que ainda está "processando"
  let saque = await prisma.saque.findFirst({
    where: {
      referenciaExterna: { in: refs },
      status: 'processando',  // Só devolve se falhou antes de confirmar
    },
  })

  if (saque) {
    await prisma.$transaction(async (tx) => {
      // 1. Marca saque como rejeitado
      await tx.saque.update({
        where: { id: saque.id },
        data: { 
          status: 'rejeitado', 
          motivo: body.reason || body.motivo || 'Saque falhou' 
        },
      })
      
      // 2. DEVOLVE o saldo ao usuário
      await tx.usuario.update({
        where: { id: saque.usuarioId },
        data: {
          saldo: { increment: saque.valor },
          saldoSacavel: { increment: saque.valor },
        },
      })
    })
  }
}
```

**Por que devolve?**
- O saldo foi debitado quando o saque foi solicitado
- Se o PIX falhou, o dinheiro não saiu
- Portanto, precisa devolver o saldo ao usuário

---

## 🔄 REVERSÃO DE DEPÓSITO (Reembolso)

### Quando ocorre:

```typescript
const isReversalOrRefund =
  eventType === 'PIX_REVERSAL' ||
  eventType === 'PIX_REFUND' ||
  eventType === 'REFUND' ||
  statusLower === 'refunded'
```

### Processo de Reversão:

```typescript
if (isReversalOrRefund) {
  // Busca transação que já foi paga
  const transacao = await prisma.transacao.findFirst({
    where: {
      OR: refs.map((r) => ({ referenciaExterna: r })),
      tipo: 'deposito',
      status: 'pago',  // Só reverte se já foi pago
    },
    include: { usuario: true },
  })

  if (transacao) {
    const bonusAplicado = transacao.bonusAplicado ?? 0
    const rolloverMult = Number(process.env.BONUS_ROLLOVER_MULTIPLIER ?? 3)
    const rolloverReverter = bonusAplicado * rolloverMult

    await prisma.$transaction(async (tx) => {
      // 1. Marca transação como falhou
      await tx.transacao.update({
        where: { id: transacao.id },
        data: { status: 'falhou' },
      })
      
      // 2. DEBITA o saldo do usuário
      await tx.usuario.update({
        where: { id: usuario.id },
        data: {
          saldo: { decrement: transacao.valor },
          saldoSacavel: { decrement: transacao.valor },
          bonusBloqueado: bonusAplicado > 0 
            ? { decrement: bonusAplicado } 
            : undefined,
          rolloverNecessario: rolloverReverter > 0 
            ? { decrement: rolloverReverter } 
            : undefined,
        },
      })
    })
  }
}
```

---

## 📊 Ordem de Processamento

O webhook processa os eventos nesta ordem:

1. **PIX_REVERSAL_OUT** (Saque falhou) → Devolve saldo
2. **PIX_REVERSAL / PIX_REFUND** (Depósito revertido) → Debita saldo
3. **expired/cancelled/failed** (Depósito falhou) → Marca como falhou
4. **PIX_PAY_OUT / COMPLETED** (Saque confirmado) → Marca como aprovado
5. **PIX_PAY_IN / paid/completed** (Depósito pago) → Credita saldo

**Por que essa ordem?**
- Reversões são processadas primeiro para evitar crédito indevido
- Depois processa confirmações de saque
- Por último processa depósitos pagos

---

## 🔍 Identificação de Transação/Saque

### Para Depósitos:

Busca por qualquer um destes campos:
- `transactionId`
- `externalId` (ex: `deposito_123_1234567890`)
- `endToEnd` (ID do PIX)

### Para Saques:

**Método 1:** Busca por `referenciaExterna` (transactionId/endToEnd)

**Método 2:** Se `externalId` começa com `"saque-"`:
- Extrai o ID: `"saque-24"` → ID `24`
- Busca saque pelo ID diretamente

**Por que dois métodos?**
- Gatebox pode enviar `externalId` diferente do que foi salvo
- O prefixo `"saque-"` garante identificação correta

---

## 📝 Exemplo de Payloads

### Depósito Pago:

```json
{
  "type": "PIX_PAY_IN",
  "status": "COMPLETED",
  "externalId": "deposito_123_1234567890",
  "transactionId": "abc123",
  "endToEnd": "E60701190202506170515DY5W414HZ69",
  "amount": 100.00
}
```

### Saque Confirmado:

```json
{
  "type": "PIX_PAY_OUT",
  "status": "COMPLETED",
  "externalId": "saque-24",
  "transactionId": "xyz789",
  "endToEnd": "E60701190202506170515DY5W414HZ69"
}
```

### Saque Falhou:

```json
{
  "type": "PIX_REVERSAL_OUT",
  "status": "FAILED",
  "externalId": "saque-24",
  "reason": "Chave PIX inválida"
}
```

---

## ⚠️ Tratamento de Erros

### Transação não encontrada:

```typescript
if (!transacao) {
  console.warn('⚠️ Webhook Gatebox: transação não encontrada', {
    refs: [transactionId, externalId, endToEnd],
    payloadKeys: Object.keys(body),
  })
  return NextResponse.json({ message: 'Transação não encontrada' }, { status: 200 })
}
```

**Retorna 200** para evitar retry da Gatebox.

### Erro no processamento:

```typescript
catch (error) {
  // Atualiza status do webhook para "failed"
  await prisma.webhookEvent.update({
    where: { id: webhookEventId },
    data: {
      status: 'failed',
      statusCode: 500,
      error: String(error),
    },
  })
  
  return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
}
```

---

## 🔐 Segurança

1. **Idempotência:** Verifica se transação já foi processada antes de creditar
2. **Transações atômicas:** Usa `prisma.$transaction` para garantir consistência
3. **Auditoria:** Todos os webhooks são registrados em `WebhookEvent`
4. **Validação:** Verifica múltiplos campos antes de processar

---

## 📈 Monitoramento

Para verificar se os webhooks estão funcionando:

1. **Admin → Tracking → Webhooks**
   - Filtre por `source: gatebox`
   - Veja status: `received`, `processed`, `failed`

2. **Logs do servidor:**
   ```
   📥 Webhook Gatebox recebido: { tipo: 'PIX_PAY_IN', externalId: '...', status: 'COMPLETED' }
   ```

3. **Verificar saldo do usuário:**
   - Confirme se foi creditado após o webhook
   - Verifique se o bônus foi aplicado corretamente

---

**Pronto!** Agora você entende como o webhook processa depósitos e saques. 🎉
