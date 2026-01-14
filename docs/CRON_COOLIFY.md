# 🕐 Configuração de Cron Job no Coolify - Sistema de Liquidação

Este guia explica como configurar o cron job para liquidação automática de apostas no Coolify.

## 📋 Pré-requisitos

- Aplicação já deployada no Coolify
- Acesso ao terminal do Coolify
- Variável de ambiente `NEXT_PUBLIC_APP_URL` configurada (URL pública da aplicação)

## 🚀 Configuração no Coolify

### Opção 1: Cron Job via Interface do Coolify (Recomendado)

1. **Acesse o painel do Coolify**
   - Vá para sua aplicação
   - Clique em **"Scheduled Tasks"** ou **"Cron Jobs"**

2. **Criar novo Cron Job**
   - Clique em **"+ Add Scheduled Task"**
   - Configure:
     - **Name**: `Liquidação Automática`
     - **Schedule**: `*/5 9-22 * * *` (executa a cada 5 minutos das 9h às 22h)
     - **Command**: 
       ```bash
       curl -X POST http://localhost:3001/api/resultados/liquidar \
         -H "Content-Type: application/json" \
         -d '{"usarMonitor": false}'
       ```
     - **Container**: Selecione o container da aplicação

3. **Salvar e ativar**

### Opção 2: Cron Job via Terminal (Alternativa)

1. **Acesse o terminal do Coolify**
   - Vá em **"Terminal"** na sua aplicação

2. **Criar script de liquidação**
   ```bash
   mkdir -p /app/scripts/cron
   cat > /app/scripts/cron/liquidar.sh << 'EOF'
   #!/bin/bash
   API_URL="${API_URL:-http://localhost:3001}"
   curl -X POST "$API_URL/api/resultados/liquidar" \
     -H "Content-Type: application/json" \
     -d '{"usarMonitor": false}'
   EOF
   chmod +x /app/scripts/cron/liquidar.sh
   ```

3. **Configurar crontab**
   ```bash
   crontab -e
   ```
   
   Adicione a linha:
   ```cron
   */5 9-22 * * * /app/scripts/cron/liquidar.sh >> /tmp/liquidacao.log 2>&1
   ```

## ⏰ Horários Recomendados

### Execução a cada 5 minutos (horário comercial)
```cron
*/5 9-22 * * *
```
- Executa das 9h às 22h, a cada 5 minutos
- Ideal para horários de sorteios frequentes

### Execução a cada 1 minuto (horário comercial)
```cron
*/1 9-22 * * *
```
- Executa das 9h às 22h, a cada 1 minuto
- Para liquidação mais rápida (mais carga no servidor)

### Execução em horários específicos
```cron
31 9,12,15,18,22 * * *
```
- Executa às 9:31, 12:31, 15:31, 18:31 e 22:31
- Para horários específicos de sorteios

## 🔧 Variáveis de Ambiente

Certifique-se de que estas variáveis estão configuradas:

```env
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
DATABASE_URL=postgres://...
```

## 📊 Monitoramento

### Ver logs do cron job

No terminal do Coolify:
```bash
# Ver logs do script
tail -f /tmp/liquidacao.log

# Ver logs da aplicação
pm2 logs tradicao-do-bicho --lines 50
```

### Testar manualmente

```bash
# Testar endpoint de liquidação
curl -X POST http://localhost:3001/api/resultados/liquidar \
  -H "Content-Type: application/json" \
  -d '{"usarMonitor": false}'

# Ver estatísticas
curl http://localhost:3001/api/resultados/liquidar
```

## 🐛 Troubleshooting

### Cron não está executando

1. **Verificar se o cron está rodando**
   ```bash
   ps aux | grep cron
   ```

2. **Verificar logs do cron**
   ```bash
   grep CRON /var/log/syslog
   ```

3. **Testar script manualmente**
   ```bash
   /app/scripts/cron/liquidar.sh
   ```

### Erro de conexão

- Verifique se `NEXT_PUBLIC_APP_URL` está configurada corretamente
- Para scripts dentro do container: Use `localhost:3001` (mesmo container)
- Para scripts externos: Use a URL pública completa

### Timeout

- Aumente o timeout no endpoint se necessário
- Verifique se o banco de dados está acessível
- Verifique se há muitas apostas pendentes

## 📝 Notas Importantes

- O cron job executa dentro do container da aplicação
- Use `localhost:3001` para requisições internas
- O script já tem tratamento de erros e logging
- Os logs são salvos em `/tmp/liquidacao.log`

## 🔄 Atualização do Script

Se precisar atualizar o script:

1. Edite o arquivo no repositório
2. Faça commit e push
3. O Coolify vai fazer rebuild automático
4. O script será atualizado no container

---

**Última atualização:** 14 de Janeiro de 2026
