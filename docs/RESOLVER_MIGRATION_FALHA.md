# Resolver Migration com Falha (P3009)

Quando o Prisma reporta `migrate found failed migrations`, a migration ficou em estado "failed" no banco.

## Sintoma

```
Error: P3009
migrate found failed migrations in the target database
The `20260129000001_add_cotadas` migration started at ... failed
```

## Solução

### 1. Verificar se a tabela já existe

```bash
npx prisma studio
```

Abra a tabela `Cotada`. Se ela existir e tiver dados, a migration provavelmente rodou mas falhou ao marcar como concluída.

### 2. Marcar migration como aplicada (se tabela existe)

```bash
npx prisma migrate resolve --applied 20260129000001_add_cotadas
```

### 3. Marcar como revertida (se quiser rodar de novo)

```bash
npx prisma migrate resolve --rolled-back 20260129000001_add_cotadas
```

Depois, rodar novamente:

```bash
npx prisma migrate deploy
```

### 4. Em produção (Coolify, etc.)

Se o deploy usa `prisma migrate deploy` e falha:

1. Conectar ao container/banco de produção
2. Executar `prisma migrate resolve --applied 20260129000001_add_cotadas`
3. Fazer novo deploy

Ou ajustar o script de start para usar `db push` em vez de `migrate deploy` (como já faz o `check-db.js`).
