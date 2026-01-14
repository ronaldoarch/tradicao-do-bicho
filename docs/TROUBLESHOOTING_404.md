# 🔧 Troubleshooting: Erro 404 no Cron Job

## ❌ Problema: 404 Not Found

O erro 404 significa que a URL não foi encontrada. Vamos verificar:

---

## 🔍 Verificações

### 1. Verificar se a URL está correta

A URL deve ser:
```
https://ig4o44cgogk084sc0g8884o4.agenciamidas.com/api/resultados/liquidar
```

**Verifique:**
- ✅ Usa `https://` (não `http://`)
- ✅ Não tem espaços ou caracteres especiais
- ✅ Termina com `/api/resultados/liquidar` (sem barra no final)

### 2. Testar URL no navegador

Abra no navegador:
```
https://ig4o44cgogk084sc0g8884o4.agenciamidas.com/api/resultados/liquidar
```

**Se funcionar:**
- Deve retornar JSON com `pendentes`, `liquidadas`, etc.

**Se não funcionar:**
- Verifique se o servidor está rodando
- Verifique se o domínio está correto

### 3. Testar no terminal do Coolify

No terminal do Coolify, execute:

```bash
# Teste GET (deve funcionar)
curl https://ig4o44cgogk084sc0g8884o4.agenciamidas.com/api/resultados/liquidar

# Teste POST (deve funcionar)
curl -X POST https://ig4o44cgogk084sc0g8884o4.agenciamidas.com/api/resultados/liquidar \
  -H "Content-Type: application/json" \
  -d '{"usarMonitor": true}'
```

### 4. Verificar se endpoint existe

No terminal do Coolify:

```bash
# Verificar se arquivo existe
ls -la app/api/resultados/liquidar/route.ts

# Verificar estrutura de rotas
find app/api -name "route.ts" | grep liquidar
```

---

## 🛠️ Soluções Possíveis

### Solução 1: Verificar domínio correto

No painel do Coolify:
1. Vá em **Projects** → Seu projeto
2. Veja qual é o **domínio público** configurado
3. Use esse domínio na URL do cron job

### Solução 2: Verificar se servidor está acessível

```bash
# No terminal do Coolify
curl -I https://ig4o44cgogk084sc0g8884o4.agenciamidas.com

# Deve retornar HTTP 200 ou 301/302
```

### Solução 3: Verificar se endpoint está deployado

```bash
# Verificar se build foi feito corretamente
ls -la .next/server/app/api/resultados/liquidar/

# Se não existir, fazer rebuild
npm run build
```

### Solução 4: Testar com localhost primeiro

No terminal do Coolify, teste localmente:

```bash
# Testar dentro do container
curl -X POST http://localhost:3000/api/resultados/liquidar \
  -H "Content-Type: application/json" \
  -d '{"usarMonitor": true}'
```

Se funcionar localmente mas não externamente:
- Problema de rede/firewall
- Domínio não está apontando corretamente
- Servidor não está acessível publicamente

---

## ✅ Checklist de Diagnóstico

Execute estes comandos no terminal do Coolify:

```bash
# 1. Verificar se servidor está rodando
ps aux | grep node

# 2. Verificar porta
netstat -tulpn | grep 3000

# 3. Testar endpoint localmente
curl http://localhost:3000/api/resultados/liquidar

# 4. Testar endpoint externamente (substitua pelo seu domínio)
curl https://SEU-DOMINIO/api/resultados/liquidar

# 5. Verificar logs
tail -50 /var/log/nextjs/app.log
```

---

## 🎯 Próximos Passos

1. **Teste a URL no navegador primeiro**
2. **Teste no terminal do Coolify**
3. **Verifique o domínio correto no painel do Coolify**
4. **Se funcionar localmente mas não externamente**, verifique configurações de rede/firewall

---

**Me envie o resultado dos testes para eu ajudar melhor!**
