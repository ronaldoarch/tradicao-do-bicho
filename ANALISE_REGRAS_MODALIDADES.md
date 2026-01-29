# Análise das Regras das Modalidades

## Comparação: Regras Fornecidas vs Implementação Atual

### ✅ Modalidades Corretas

1. **Grupo Simples** - 18x ✅
2. **Dupla de Grupo** - 180x ✅
3. **Terno de Grupo** - 1800x ✅
4. **Quadra de Grupo** - 5000x ✅
5. **Dezena** - 60x ✅ (mas falta variação por posição)
6. **Centena** - 600x ✅ (mas falta variação por posição e redução cotada)
7. **Milhar** - 5000x ✅ (mas falta variação por posição)
8. **Dezena Invertida** - 60x ✅
9. **Centena Invertida** - 600x ✅
10. **Milhar Invertida** - 200x ✅
11. **Milhar/Centena** - 3300x ✅
12. **Passe Vai** - 300x ✅
13. **Passe Vai e Vem** - 150x ✅

### ❌ Modalidades Faltando

1. **Quina de Grupo** - 5000x
2. **Terno de Grupo Seco** - 150x (limitado até 5º)
3. **Duque de Dezena** - 300x
4. **Terno de Dezena** - 5000x
5. **Quadra de Dezena** - 300x
6. **Dezeninha** - Variável (3 dezenas: 15x, 4: 150x, 5+: 1500x)
7. **Duque de Dezena EMD** - 300x
8. **Terno de Dezena EMD** - 5000x

### ⚠️ Problemas Identificados

#### 1. Multiplicadores por Posição (Dezena, Centena, Milhar)

**Regra Fornecida:**
- **Dezena:** 60x (1º), 30x (2º), 15x (3º), 7.5x (4º), etc.
- **Centena:** 600x (1º), 300x (2º), 150x (3º), etc.
- **Milhar:** 5000x (1º), 2000x (2º), 1000x (3º), etc.

**Implementação Atual:**
- Todas as posições usam o mesmo multiplicador (60x, 600x, 5000x)

**Correção Necessária:**
- Implementar multiplicadores diferentes por posição dentro do intervalo

#### 2. Redução Cotada (Centena e Milhar)

**Regra Fornecida:**
- Se marcada como "cotada", multiplicador ÷ 6

**Implementação Atual:**
- Não implementado

**Correção Necessária:**
- Adicionar flag "cotada" e aplicar divisão por 6 quando ativa

#### 3. Grupo Simples - Pagamento por Ocorrência

**Regra Fornecida:**
- No 1º ao 7º: paga por ocorrência
- Se o grupo aparecer 2 vezes, paga 2 vezes

**Implementação Atual:**
- ✅ CORRETO: `conferirGrupoSimples` conta quantas vezes o grupo aparece

#### 4. Passe - Regra Corrigida

**Regra Fornecida:**
- **Passe vai:** Grupo do 1º = Grupo do 2º (ordem não importa)
- **Passe vai e vem:** Grupos do 1º e 2º são iguais (ordem não importa)

**Implementação Atual:**
- ⚠️ Passe vai está verificando ordem específica (grupo1 no 1º e grupo2 no 2º)
- ✅ Passe vai e vem está correto (aceita ambas as ordens)

**Correção Necessária:**
- Passe vai deve verificar se os grupos são iguais, não se são específicos

## Resumo de Correções Necessárias

### Prioridade Alta

1. ✅ **Implementar multiplicadores por posição** para Dezena, Centena e Milhar
2. ✅ **Corrigir regra do Passe Vai** (deve verificar grupos iguais, não específicos)
3. ✅ **Implementar redução cotada** para Centena e Milhar

### Prioridade Média

4. ⚠️ **Adicionar modalidades faltantes:**
   - Quina de Grupo
   - Terno de Grupo Seco
   - Duque de Dezena
   - Terno de Dezena
   - Quadra de Dezena
   - Dezeninha
   - Duque de Dezena EMD
   - Terno de Dezena EMD

### Prioridade Baixa

5. ⚠️ Documentar melhor as regras especiais (Federal, etc.)
