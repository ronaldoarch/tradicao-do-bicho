# Corrigir erros P3009 / P3018 (Migração falhou)

Quando aparece:

```
Error: P3009 - migrate found failed migrations
Error: P3018 - A migration failed to apply. New migrations cannot be applied...
Migration name: 20260129000000_add_configuracao_frk
Database error: relation "ConfiguracaoFrk" already exists
```

## Solução rápida (no servidor / Coolify)

Execute no console do Coolify ou via SSH no container:

```bash
npx prisma migrate resolve --applied "20250124000000_add_configuracao_gatebox"
npx prisma migrate resolve --applied "20250124000001_update_gateway_model"
npx prisma migrate resolve --applied "20260129000000_add_configuracao_frk"
npx prisma migrate deploy
```

Ou use o script:

```bash
./scripts/fix-migration-p3009.sh
```

## O que acontece

1. A migração falhou (timeout, conexão, etc.) no meio da execução
2. O Prisma marca a migração como "failed" e bloqueia as próximas
3. Se o `db push` já sincronizou o schema, o banco está ok
4. O `resolve --applied` marca a migração como aplicada sem rodar o SQL de novo
5. O `migrate deploy` pode continuar com as migrações pendentes

## Preventivo

O `scripts/check-db.js` já tenta fazer o resolve automaticamente quando detecta P3009. Se não funcionar, use o comando manual acima.
