# 🧪 Guia de Testes - Sistema de Regras de Apostas

**Última atualização:** 15 de Janeiro de 2026

Este documento descreve como executar e entender os testes do sistema de regras de apostas.

---

## 📋 Índice

1. [Executando os Testes](#executando-os-testes)
2. [Estrutura dos Testes](#estrutura-dos-testes)
3. [Cobertura de Testes](#cobertura-de-testes)
4. [Interpretando os Resultados](#interpretando-os-resultados)

---

## 🚀 Executando os Testes

### Teste Manual (Recomendado)

O projeto inclui um script de teste manual que não requer instalação de dependências adicionais:

```bash
npm run test:manual
```

Este comando executa `tsx scripts/test-bet-rules.ts` e valida todas as funcionalidades do motor de regras.

### Testes com Jest (Opcional)

Se você tiver Jest instalado, pode executar:

```bash
npm test              # Executa todos os testes
npm run test:watch    # Modo watch (re-executa ao salvar)
npm run test:coverage # Com cobertura de código
```

---

## 📁 Estrutura dos Testes

### Arquivo Principal

**`scripts/test-bet-rules.ts`**

Este arquivo contém todos os testes organizados em seções:

1. **Testes de Conversão** - Valida conversão de dezenas/milhares para grupos
2. **Testes de Permutações** - Valida geração de permutações para modalidades invertidas
3. **Testes de Cálculo de Valor** - Valida cálculos de valor por palpite e unidades
4. **Testes de Cálculo por Modalidade** - Valida cálculos específicos de cada modalidade
5. **Testes de Odds** - Valida tabela de multiplicadores
6. **Testes de Cálculo de Prêmios** - Valida cálculo final de prêmios
7. **Testes de Conferência de Resultados** - Valida lógica de conferência
8. **Exemplos Práticos do Guia** - Valida exemplos do documento de regras
9. **Testes de Geração de Resultado** - Valida geração de resultados instantâneos

### Arquivo de Testes Jest (Opcional)

**`__tests__/bet-rules-engine.test.ts`**

Este arquivo contém testes no formato Jest para integração com ferramentas de CI/CD.

---

## ✅ Cobertura de Testes

### Funções Testadas

#### Conversão
- ✅ `dezenaParaGrupo()` - Converte dezena para grupo
- ✅ `milharParaGrupo()` - Converte milhar para grupo

#### Permutações
- ✅ `contarPermutacoesDistintas()` - Conta permutações distintas
- ✅ `gerarPermutacoesDistintas()` - Gera array de permutações

#### Cálculos
- ✅ `calcularValorPorPalpite()` - Calcula valor por palpite ("para cada" vs "para todos")
- ✅ `calcularUnidades()` - Calcula unidades de aposta
- ✅ `calcularValorUnitario()` - Calcula valor unitário
- ✅ `calcularNumero()` - Calcula para modalidades de número
- ✅ `calcularGrupo()` - Calcula para modalidades de grupo
- ✅ `buscarOdd()` - Busca odd da modalidade
- ✅ `calcularPremioUnidade()` - Calcula prêmio por unidade
- ✅ `calcularPremioPalpite()` - Calcula prêmio total do palpite

#### Conferência
- ✅ `conferirGrupoSimples()` - Confere grupo simples
- ✅ `conferirDuplaGrupo()` - Confere dupla de grupo
- ✅ `conferirTernoGrupo()` - Confere terno de grupo
- ✅ `conferirQuadraGrupo()` - Confere quadra de grupo
- ✅ `conferirNumero()` - Confere modalidades de número
- ✅ `conferirPasse()` - Confere passe vai e vai-e-vem
- ✅ `conferirPalpite()` - Função principal de conferência

#### Geração
- ✅ `gerarResultadoInstantaneo()` - Gera resultado instantâneo

### Modalidades Testadas

- ✅ Grupo Simples
- ✅ Dupla de Grupo
- ✅ Terno de Grupo
- ✅ Quadra de Grupo
- ✅ Dezena Normal
- ✅ Centena Normal
- ✅ Milhar Normal
- ✅ Dezena Invertida
- ✅ Centena Invertida
- ✅ Milhar Invertida
- ✅ Milhar/Centena
- ✅ Passe Vai
- ✅ Passe Vai e Vem

### Cenários Testados

- ✅ "Para cada palpite" vs "Para todos os palpites"
- ✅ Diferentes intervalos de posições (1º, 1º-3º, 1º-5º, 1º-7º)
- ✅ Acertos e não acertos
- ✅ Cálculos de prêmios corretos
- ✅ Validação de grupos e números

---

## 📊 Interpretando os Resultados

### Saída do Teste Manual

```
🧪 Iniciando testes do motor de regras de apostas...

📐 Testes de Conversão
──────────────────────────────────────────────────
✅ PASSOU: Dezena 01 → Grupo 01
✅ PASSOU: Dezena 21 → Grupo 06
...

📊 Resumo:
  • Conversões: OK
  • Permutações: OK
  • Cálculos de valor: OK
  • Cálculos por modalidade: OK
  • Odds: OK
  • Conferência de resultados: OK
  • Exemplos práticos: OK
  • Geração de resultados: OK

🎉 Sistema de regras validado com sucesso!
```

### Significado dos Símbolos

- ✅ **PASSOU** - Teste passou com sucesso
- ❌ **FALHOU** - Teste falhou (mostra valores esperado vs recebido)

### Exemplo de Falha

Se um teste falhar, você verá:

```
❌ FALHOU: Dupla grupos 01 e 06 acerta
   Esperado: 1
   Recebido: 0
```

Isso indica que:
- O teste esperava que a dupla de grupos 01 e 06 acertasse (hits = 1)
- Mas o resultado foi que não acertou (hits = 0)
- Possíveis causas: grupos não aparecem no resultado ou lógica de conferência incorreta

---

## 🔧 Adicionando Novos Testes

### Estrutura de um Teste

```typescript
// Teste simples
assertEqual(actual, expected, 'Descrição do teste')

// Teste com tolerância (para números decimais)
assertCloseTo(actual, expected, tolerance, 'Descrição do teste')

// Teste booleano
assert(condition, 'Descrição do teste')
```

### Exemplo: Adicionar Teste para Nova Modalidade

```typescript
console.log('🎯 Testes de Nova Modalidade')
console.log('─'.repeat(50))

const resultado: any = {
  prizes: [4321, 589, 7727, 1297, 5060],
  groups: [6, 23, 7, 25, 15],
}

const palpite = conferirPalpite(
  resultado,
  'NOVA_MODALIDADE',
  { grupos: [6, 15] },
  1,
  5,
  10,
  'each'
)

assertEqual(palpite.prize.hits, 1, 'Nova modalidade acerta')
assertEqual(palpite.totalPrize, 100, 'Nova modalidade: prêmio correto')

console.log()
```

---

## 📚 Referências

- **Documento de Regras**: `/docs/REGRAS_COMPLETAS_MODALIDADES.md`
- **Motor de Regras**: `/lib/bet-rules-engine.ts`
- **Script de Testes**: `/scripts/test-bet-rules.ts`

---

## 🐛 Troubleshooting

### Erro: "command not found: tsx"

**Solução:** Instale o tsx:
```bash
npm install --save-dev tsx
```

### Erro: "Cannot find module '@/lib/bet-rules-engine'"

**Solução:** Verifique se o `tsconfig.json` tem o mapeamento de paths:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Teste falha mas parece correto

**Solução:** 
1. Verifique os valores esperados no documento de regras
2. Verifique se o resultado de teste está correto
3. Verifique se a lógica de conferência está implementada corretamente

---

**Última atualização:** 15 de Janeiro de 2026
