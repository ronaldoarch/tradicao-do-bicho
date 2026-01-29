# ⏰ Configurar Cron Job de Liquidação no Coolify

## ⚠️ IMPORTANTE: Este projeto é Next.js/Node.js, NÃO PHP/Laravel!

## 📋 Configuração no Coolify

### Campos do Formulário "New Scheduled Task":

1. **Name**: `Liquidação Automática`

2. **Command**: 
   ```bash
   curl -X POST http://localhost:3001/api/resultados/liquidar -H "Content-Type: application/json" -d '{"usarMonitor": false}' --max-time 120
   ```
   
   **OU** (se preferir usar o script):
   ```bash
   /app/scripts/cron/liquidar.sh
   ```

3. **Frequency**: 
   ```
   */5 * * * *
   ```
   - Executa **a cada 5 minutos** sempre (24 horas por dia)

4. **Timeout (seconds)**: `300` (5 minutos)

5. **Container name**: 
   - ⚠️ **CRÍTICO**: Deve ser o nome do container da sua aplicação Next.js
   - ❌ **NÃO use "php"** - isso está errado!
   - ✅ O nome correto geralmente é o ID da aplicação ou o nome que você definiu
   - Para descobrir:
     - Vá em **"Containers"** na sua aplicação no Coolify
     - Veja o nome do container principal (geralmente é o mesmo ID da aplicação)
     - Exemplo: `b88k48gccgkwkg4sko4ssw4c` ou `tradicao-do-bicho`

## 🔄 Opções de Frequência

### Opção 1: A cada 5 minutos (Recomendado)
```
*/5 * * * *
```
- Executa a cada 5 minutos sempre (24 horas por dia)
- Ideal para liquidação contínua

### Opção 2: A cada 1 minuto (Mais rápido)
```
*/1 * * * *
```
- Executa a cada 1 minuto sempre (24 horas por dia)
- Para liquidação mais rápida (mais carga no servidor)

### Opção 3: A cada 10 minutos (Menos carga)
```
*/10 * * * *
```
- Executa a cada 10 minutos sempre (24 horas por dia)
- Menos carga no servidor

## ✅ Verificação

Após salvar, verifique:

1. **Logs do Cron Job**:
   - No Coolify, vá em **"Logs"** do Scheduled Task
   - Você deve ver execuções regulares com respostas JSON

2. **Teste Manual**:
   ```bash
   # No terminal do container
   curl -X POST http://localhost:3001/api/resultados/liquidar \
     -H "Content-Type: application/json" \
     -d '{"usarMonitor": false}'
   ```

3. **Verificar Estatísticas**:
   ```bash
   # Ver quantas apostas estão pendentes
   curl http://localhost:3001/api/resultados/liquidar
   ```

## 🐛 Troubleshooting

### Erro "Container not found"
- ❌ O nome do container está errado
- ✅ Use o nome exato do container da aplicação Next.js
- ✅ Não use "php" ou outros nomes genéricos
- ✅ Verifique em "Containers" qual é o nome correto

### Erro 404 Not Found
- Verifique se a URL está correta: `http://localhost:3001/api/resultados/liquidar`
- Certifique-se de que o servidor está rodando dentro do container
- Teste manualmente no terminal do container

### Timeout
- Aumente o timeout para 600 segundos se necessário
- Verifique se há muitas apostas pendentes
- Verifique se o banco de dados está acessível

### Cron não está executando
1. Verifique o nome do container:
   ```bash
   # No terminal do Coolify
   docker ps | grep sua-aplicacao
   ```

2. Verifique os logs:
   - No Coolify: **"Logs"** do Scheduled Task
   - No container: `tail -f /var/log/liquidar.log`

3. Teste o script manualmente:
   ```bash
   docker exec -it NOME_DO_CONTAINER curl -X POST http://localhost:3001/api/resultados/liquidar -H "Content-Type: application/json" -d '{"usarMonitor": false}'
   ```

## 📝 Notas Importantes

- ✅ O script usa `localhost:3001` para chamar a API internamente (dentro do mesmo container)
- ✅ O timeout de 300 segundos é suficiente para processar múltiplas apostas
- ✅ Os logs são salvos em `/var/log/liquidar.log` (se usar o script)
- ✅ A resposta da API inclui estatísticas: `processadas`, `liquidadas`, `premioTotal`

## 🎯 Exemplo Completo de Configuração

```
Name: Liquidação Automática
Command: curl -X POST http://localhost:3001/api/resultados/liquidar -H "Content-Type: application/json" -d '{"usarMonitor": false}' --max-time 120
Frequency: */5 * * * *
Timeout: 300
Container name: [NOME_DO_CONTAINER_DA_APLICACAO_NEXTJS]
```

---

**Última atualização:** 29 de Janeiro de 2026
