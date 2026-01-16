# ⚠️ Sistema de Descarga / Controle de Banca por Prêmio

**Última atualização:** 15 de Janeiro de 2026

Este documento descreve o sistema de descarga/controle de banca implementado no sistema.

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Funcionamento](#funcionamento)
3. [Configuração](#configuração)
4. [Alertas](#alertas)
5. [Estatísticas](#estatísticas)
6. [APIs](#apis)
7. [Interface Admin](#interface-admin)

---

## 🎯 Visão Geral

O sistema de descarga permite ao administrador definir **limites máximos de apostas por modalidade e por prêmio**, com o objetivo de gerenciar riscos e controlar a exposição da banca.

### Características Principais

- ✅ **Não bloqueia apostas** - Usuários continuam jogando normalmente
- ✅ **Gera alertas** - Administrador é notificado quando limites são ultrapassados
- ✅ **Controle global** - Limites são aplicados globalmente, não por jogador
- ✅ **Por prêmio** - Controle específico para cada prêmio (1º ao 5º)
- ✅ **Por modalidade** - Limites diferentes para cada modalidade

---

## 🔍 Funcionamento

### Fluxo de Verificação

1. **Usuário faz uma aposta**
2. **Sistema verifica limites** após criar a aposta
3. **Se ultrapassar limite:**
   - ✅ Aposta é **aceita normalmente**
   - ⚠️ **Alerta é gerado** no painel admin
   - 📊 **Estatísticas são atualizadas**

### Cálculo do Total Apostado

O sistema calcula o total apostado considerando:

- **Modalidade** da aposta
- **Prêmio(s)** coberto(s) pela aposta (baseado na posição escolhida)
- **Status** da aposta (apenas `pendente` e `liquidado` são contados)
- **Data do concurso** (opcional, para filtrar por data específica)

**Exemplo:**
- Aposta: Grupo Simples, posição 1º ao 5º, valor R$ 10,00
- Esta aposta conta para os prêmios: 1º, 2º, 3º, 4º, 5º
- Cada prêmio recebe R$ 10,00 no total apostado

---

## ⚙️ Configuração

### Criar Limite

1. Acesse **Admin > Descarga / Banca**
2. Clique em **"+ Novo Limite"**
3. Preencha:
   - **Modalidade**: Selecione a modalidade (ex: GRUPO, MILHAR, etc.)
   - **Prêmio**: Selecione o prêmio (1º ao 5º)
   - **Limite**: Valor máximo em R$ (ex: 1000.00)
4. Clique em **Salvar**

### Editar Limite

Os limites são atualizados automaticamente ao criar um novo limite com a mesma modalidade e prêmio.

### Deletar Limite

Clique em **Deletar** ao lado do limite desejado.

### Ativar/Desativar

Por padrão, limites são criados como **ativos**. Para desativar, edite o limite e defina como inativo.

---

## 🚨 Alertas

### Quando são Gerados

Alertas são gerados automaticamente quando:

- Uma aposta é criada
- O total apostado (incluindo a nova aposta) ultrapassa o limite configurado

### Informações do Alerta

Cada alerta contém:

- **Modalidade**: Modalidade que ultrapassou o limite
- **Prêmio**: Prêmio específico (1º ao 5º)
- **Limite**: Limite configurado
- **Total Apostado**: Total já apostado nesta modalidade/prêmio
- **Excedente**: Valor que ultrapassou o limite
- **Data do Concurso**: Data relacionada (se aplicável)
- **Data de Criação**: Quando o alerta foi gerado

### Resolver Alerta

1. Acesse a aba **Alertas**
2. Clique em **Resolver** ao lado do alerta
3. O alerta será marcado como resolvido

**Nota:** Resolver um alerta não remove o limite. Novos alertas serão gerados se o limite continuar sendo ultrapassado.

---

## 📊 Estatísticas

A aba **Estatísticas** mostra:

- **Total apostado** por modalidade e prêmio
- **Limite configurado** (se houver)
- **Status**: Dentro do limite ou Ultrapassado
- **Excedente**: Quanto ultrapassou (se aplicável)

### Filtros

As estatísticas podem ser filtradas por:

- **Modalidade**: Ver apenas uma modalidade específica
- **Prêmio**: Ver apenas um prêmio específico
- **Data do Concurso**: Ver apenas apostas de uma data específica

---

## 🔌 APIs

### Limites

#### GET `/api/admin/descarga/limites`
Lista todos os limites configurados.

**Resposta:**
```json
{
  "limites": [
    {
      "id": 1,
      "modalidade": "GRUPO",
      "premio": 1,
      "limite": 1000.00,
      "ativo": true,
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-01-15T10:00:00Z"
    }
  ]
}
```

#### POST `/api/admin/descarga/limites`
Cria ou atualiza um limite.

**Body:**
```json
{
  "modalidade": "GRUPO",
  "premio": 1,
  "limite": 1000.00,
  "ativo": true
}
```

#### DELETE `/api/admin/descarga/limites?id={id}`
Remove um limite.

### Alertas

#### GET `/api/admin/descarga/alertas?resolvido=false`
Lista alertas (resolvidos ou não).

**Query Params:**
- `resolvido`: `true` ou `false` (padrão: `false`)

**Resposta:**
```json
{
  "alertas": [
    {
      "id": 1,
      "modalidade": "GRUPO",
      "premio": 1,
      "limite": 1000.00,
      "totalApostado": 1200.00,
      "excedente": 200.00,
      "dataConcurso": "2026-01-15T00:00:00Z",
      "resolvido": false,
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ]
}
```

#### POST `/api/admin/descarga/alertas/resolver`
Resolve um alerta.

**Body:**
```json
{
  "alertaId": 1
}
```

### Estatísticas

#### GET `/api/admin/descarga/estatisticas?modalidade=GRUPO&premio=1&dataConcurso=2026-01-15`
Busca estatísticas de descarga.

**Query Params:**
- `modalidade`: (opcional) Filtrar por modalidade
- `premio`: (opcional) Filtrar por prêmio (1-5)
- `dataConcurso`: (opcional) Filtrar por data (ISO format)

**Resposta:**
```json
{
  "estatisticas": [
    {
      "modalidade": "GRUPO",
      "premio": 1,
      "totalApostado": 1200.00,
      "limite": 1000.00,
      "excedente": 200.00,
      "ultrapassou": true
    }
  ]
}
```

---

## 🖥️ Interface Admin

### Acessar

1. Faça login no painel admin
2. No menu lateral, clique em **"⚠️ Descarga / Banca"**

### Abas

#### 1. Limites Configurados
- Lista todos os limites configurados
- Permite criar, editar e deletar limites
- Mostra status (Ativo/Inativo)

#### 2. Alertas
- Lista alertas não resolvidos
- Mostra informações detalhadas de cada alerta
- Permite resolver alertas

#### 3. Estatísticas
- Mostra estatísticas em tempo real
- Indica quais limites foram ultrapassados
- Ordenado por excedente (maior primeiro)

---

## 📝 Exemplos Práticos

### Exemplo 1: Configurar Limite para Grupo no 1º Prêmio

1. Acesse **Admin > Descarga / Banca**
2. Clique em **"+ Novo Limite"**
3. Selecione:
   - Modalidade: `GRUPO`
   - Prêmio: `1º Prêmio`
   - Limite: `R$ 1.000,00`
4. Clique em **Salvar**

**Resultado:**
- Sistema monitora todas as apostas de Grupo que cobrem o 1º prêmio
- Quando total apostado ultrapassar R$ 1.000,00, gera alerta
- Usuários continuam jogando normalmente

### Exemplo 2: Verificar Alertas

1. Acesse **Admin > Descarga / Banca > Alertas**
2. Veja lista de alertas pendentes
3. Cada alerta mostra:
   - Modalidade e prêmio
   - Limite e total apostado
   - Excedente em vermelho
4. Clique em **Resolver** após tomar ação de descarga

### Exemplo 3: Ver Estatísticas

1. Acesse **Admin > Descarga / Banca > Estatísticas**
2. Veja todas as modalidades e prêmios com limites configurados
3. Alertas em vermelho indicam limites ultrapassados
4. Use para monitorar situação geral da banca

---

## 🔧 Implementação Técnica

### Modelos de Dados

#### LimiteDescarga
```prisma
model LimiteDescarga {
  id         Int      @id @default(autoincrement())
  modalidade String
  premio     Int      // 1-5
  limite     Float
  ativo      Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([modalidade, premio])
}
```

#### AlertaDescarga
```prisma
model AlertaDescarga {
  id            Int       @id @default(autoincrement())
  modalidade    String
  premio        Int
  limite        Float
  totalApostado Float
  excedente     Float
  dataConcurso  DateTime?
  resolvido     Boolean   @default(false)
  resolvidoEm   DateTime?
  resolvidoPor  Int?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

### Funções Principais

#### `calcularTotalApostadoPorPremio()`
Calcula o total já apostado para uma modalidade e prêmio específicos.

#### `verificarLimiteDescarga()`
Verifica se uma aposta ultrapassa os limites configurados e gera alertas se necessário.

#### `criarAlertaDescarga()`
Cria ou atualiza um alerta quando limite é ultrapassado.

#### `buscarEstatisticasDescarga()`
Busca estatísticas de descarga com filtros opcionais.

---

## ⚠️ Importante

### O Sistema NÃO Bloqueia Apostas

**Por design**, o sistema **não bloqueia** apostas quando limites são ultrapassados. Isso permite:

- ✅ Usuários continuarem jogando normalmente
- ✅ Administrador ter controle total sobre quando fazer descarga
- ✅ Flexibilidade para ajustar limites sem impactar usuários

### Responsabilidade do Administrador

O administrador deve:

1. **Monitorar alertas** regularmente
2. **Tomar ações de descarga** quando necessário
3. **Resolver alertas** após tomar ação
4. **Ajustar limites** conforme necessário

---

## 🔗 Referências

- **Código**: `/lib/descarga-helpers.ts`
- **APIs**: `/app/api/admin/descarga/`
- **Interface**: `/app/admin/descarga/page.tsx`
- **Schema**: `/prisma/schema.prisma`

---

**Última atualização:** 15 de Janeiro de 2026
