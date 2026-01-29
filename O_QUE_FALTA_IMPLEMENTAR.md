# O Que Falta Implementar

## ✅ Já Implementado

1. ✅ **Multiplicadores por posição** - Dezena, Centena e Milhar
2. ✅ **Passe Vai** - Corrigido (requer seleção de grupos)
3. ✅ **Passe Vai e Vem** - Funcionando corretamente
4. ✅ **Estrutura para redução cotada** - Pronta (falta adicionar flag no frontend)

## ❌ Falta Implementar

### 1. Modalidades de Grupo Faltantes

#### Quina de Grupo
- **Seleção:** 5 grupos diferentes
- **Posições:** 1º, 1º-3º, 1º-5º, 1º-7º
- **Multiplicador:** 5000x
- **Regra:** Os 5 grupos devem aparecer no intervalo
- **Status:** Existe no `modalities.ts` mas não implementado no motor

#### Terno de Grupo Seco
- **Seleção:** 3 grupos diferentes
- **Posições:** 1º, 1º-3º, 1º-5º (máximo até 5º)
- **Multiplicador:** 150x
- **Regra:** Igual ao terno de grupo, mas limitado até 5º prêmio
- **Status:** Não existe

### 2. Modalidades de Dezena Faltantes

#### Duque de Dezena
- **Seleção:** 2 dezenas diferentes (ex.: 34 e 56)
- **Posições:** 1º, 1º-3º, 1º-5º, 1º-7º
- **Multiplicador:** 300x
- **Regra:** Ambas as dezenas devem aparecer no intervalo (ordem não importa)
- **Status:** Existe no `modalities.ts` mas não implementado no motor

#### Terno de Dezena
- **Seleção:** 3 dezenas diferentes
- **Posições:** 1º, 1º-3º, 1º-5º, 1º-7º
- **Multiplicador:** 5000x
- **Regra:** As 3 dezenas devem aparecer no intervalo
- **Status:** Existe no `modalities.ts` mas não implementado no motor

#### Quadra de Dezena
- **Seleção:** 4 dezenas diferentes
- **Posições:** 1º, 1º-3º, 1º-5º, 1º-7º
- **Multiplicador:** 300x
- **Regra:** As 4 dezenas devem aparecer no intervalo
- **Status:** Não existe

#### Dezeninha
- **Seleção:** 3 a 20 dezenas diferentes
- **Posições:** 1º, 1º-3º, 1º-5º, 1º-7º
- **Multiplicador variável:**
  - 3 dezenas: 15x
  - 4 dezenas: 150x
  - 5+ dezenas: 1500x
- **Regra:** Todas as dezenas apostadas devem aparecer no intervalo
- **Status:** Não existe

### 3. Modalidades EMD (Esquerda, Meio, Direita)

#### Duque de Dezena EMD
- **Seleção:** 1 dezena (2 dígitos)
- **Posições:** 1º, 1º-3º, 1º-5º, 1º-7º
- **Multiplicador:** 300x
- **Regra:** A dezena pode aparecer como:
  - Esquerda (2 primeiros dígitos do milhar)
  - Meio (2 dígitos do meio)
  - Direita (2 últimos dígitos)
- **Exemplo:** Dezena 34 — ganha se aparecer em qualquer posição EMD
- **Status:** Não existe

#### Terno de Dezena EMD
- **Seleção:** 3 dezenas diferentes
- **Posições:** 1º, 1º-3º, 1º-5º, 1º-7º
- **Multiplicador:** 5000x
- **Regra:** As 3 dezenas devem aparecer usando posições EMD
- **Status:** Não existe

### 4. Frontend - Flag "Cotada"

- **Status:** Estrutura pronta no backend, falta adicionar no frontend
- **O que fazer:**
  - Adicionar campo `cotada: boolean` em `BetData` (`types/bet.ts`)
  - Adicionar checkbox/switch na UI para marcar como "cotada"
  - Passar flag para o backend ao criar aposta
  - Backend já aplica ÷6 quando flag está ativa

## Resumo por Prioridade

### 🔴 Alta Prioridade (Modalidades já no frontend)
1. **Quina de Grupo** - Existe no `modalities.ts`, falta implementar lógica
2. **Duque de Dezena** - Existe no `modalities.ts`, falta implementar lógica
3. **Terno de Dezena** - Existe no `modalities.ts`, falta implementar lógica

### 🟡 Média Prioridade (Novas modalidades)
4. **Terno de Grupo Seco** - Similar ao terno, mas limitado até 5º
5. **Quadra de Dezena** - Similar ao duque/terno de dezena
6. **Dezeninha** - Modalidade especial com multiplicadores variáveis

### 🟢 Baixa Prioridade (Modalidades EMD)
7. **Duque de Dezena EMD** - Lógica mais complexa (verificar E/M/D)
8. **Terno de Dezena EMD** - Lógica mais complexa (verificar E/M/D)

### 🔵 Frontend
9. **Flag "Cotada"** - Adicionar UI para marcar apostas como cotadas
