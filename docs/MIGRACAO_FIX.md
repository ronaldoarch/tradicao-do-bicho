# 🔧 Como Resolver Erro de Migração P3006

Se você está recebendo o erro:
```
Error: P3006
Migration `20260116181006_add_sorteios_automaticos_bingo` failed to apply cleanly to the shadow database.
Error: The underlying table for model `SalaBingo` does not exist.
```

## Solução 1: Marcar Migração Anterior como Aplicada (Recomendado)

Se a migração `add_sorteios_automaticos_bingo` já foi aplicada no banco de produção, marque-a como aplicada:

```bash
npx prisma migrate resolve --applied 20260116181006_add_sorteios_automaticos_bingo
```

Depois, crie a nova migração:

```bash
npx prisma migrate dev --name add_configuracao_descarga
```

## Solução 2: Usar db push (Desenvolvimento)

Se você está em desenvolvimento e não se importa com histórico de migrações:

```bash
npx prisma db push
```

Isso aplicará todas as mudanças do schema diretamente no banco, sem criar arquivos de migração.

## Solução 3: Criar Migração Baseline (Produção)

Se você está em produção e precisa manter histórico:

1. Marque todas as migrações anteriores como aplicadas:
```bash
npx prisma migrate resolve --applied 20260116181006_add_sorteios_automaticos_bingo
```

2. Crie a nova migração:
```bash
npx prisma migrate dev --name add_configuracao_descarga --create-only
```

3. Revise o arquivo SQL gerado em `prisma/migrations/`

4. Aplique a migração:
```bash
npx prisma migrate deploy
```

## Solução 4: Resetar Shadow Database

Se o problema persistir, você pode resetar o shadow database:

```bash
# No arquivo .env, adicione ou modifique:
SHADOW_DATABASE_URL="postgresql://user:password@localhost:5432/shadow_db"

# Depois execute:
npx prisma migrate dev --name add_configuracao_descarga
```

## Verificar Estado das Migrações

Para ver quais migrações foram aplicadas:

```bash
npx prisma migrate status
```

## ⚠️ Importante

- **Em produção**: Use `prisma migrate deploy` após revisar as migrações
- **Em desenvolvimento**: `prisma migrate dev` é suficiente
- **Se houver dados importantes**: Sempre faça backup antes de migrar
