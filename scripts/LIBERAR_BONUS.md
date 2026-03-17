# Como Liberar Bônus Bloqueado Manualmente

Use este script quando um usuário tem bônus bloqueado e precisa ser liberado manualmente (ex.: jogou no Bingo antes da correção do rollover).

## Pré-requisitos

- Acesso ao projeto e banco de dados configurado
- Node.js com `npx` disponível

## Opção 1: Por ID do usuário

```bash
npx tsx scripts/liberar-bonus.ts <userId>
```

Exemplo para o usuário com ID 42:
```bash
npx tsx scripts/liberar-bonus.ts 42
```

## Opção 2: Por nome (busca parcial)

```bash
npx tsx scripts/liberar-bonus.ts --nome "Sérgio Ricardo"
```

O script busca o primeiro usuário cujo nome contém o texto informado.

## O que o script faz

1. Localiza o usuário
2. Verifica se há bônus bloqueado
3. Transfere `bonusBloqueado` → `bonus` (disponível para uso)
4. Zera `bonusBloqueado`, `rolloverNecessario` e `rolloverAtual`

## Para descobrir o ID do usuário

```bash
npx prisma studio
```

Abra a tabela `Usuario`, busque pelo nome (ex.: "Sérgio Ricardo da Silva Monteiro") e anote o ID.
