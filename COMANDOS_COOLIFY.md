# 🚀 Comandos para Terminal do Coolify

## ⚡ Comandos Essenciais (Execute nesta ordem)

### 1. Verificar se aplicação está rodando

```bash
ps aux | grep node
# ou
pm2 list
```

### 2. Verificar variáveis de ambiente

```bash
echo $DATABASE_URL
echo $AUTH_SECRET
echo $BICHO_CERTO_API
```

### 3. Executar migrações (se necessário)

```bash
# O script check-db.js já executa isso no start, mas pode rodar manualmente:
npx prisma generate
npx prisma db push
```

### 4. Testar endpoints

```bash
# Testar endpoint de estatísticas
curl http://localhost:3000/api/resultados/liquidar

# Testar liquidação manual
curl -X POST http://localhost:3000/api/resultados/liquidar \
  -H "Content-Type: application/json" \
  -d '{"usarMonitor": false}'
```

### 5. Verificar logs

```bash
# Ver logs recentes
tail -50 /var/log/nextjs/app.log
# ou se usar PM2
pm2 logs --lines 50
```

---

## ✅ Checklist Rápido

Execute estes comandos e verifique:

```bash
# 1. Aplicação rodando?
curl http://localhost:3000/api/status

# 2. Banco conectado?
npx prisma db pull

# 3. Endpoint de liquidação funcionando?
curl http://localhost:3000/api/resultados/liquidar

# 4. Testar liquidação manual
curl -X POST http://localhost:3000/api/resultados/liquidar \
  -H "Content-Type: application/json" \
  -d '{"usarMonitor": false}' | jq
```

---

## 📝 Nota Importante

O script `check-db.js` já executa automaticamente:
- ✅ Criação de diretórios de upload
- ✅ Verificação/criação de tabelas (`prisma db push`)

**Então você só precisa:**
1. Verificar se está tudo rodando
2. Testar os endpoints
3. Configurar cron job (se necessário)

---

**Documentação completa:** `docs/COMANDOS_COOLIFY.md`
