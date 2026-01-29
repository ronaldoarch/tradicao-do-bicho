# 🎲 Configurar Cron Job de Sorteios Automáticos no Coolify

## ⚠️ Configuração Importante

No Coolify, configure o Scheduled Task da seguinte forma:

### Campos do Formulário:

1. **Name**: `Sorteios Automáticos Bingo`

2. **Command**: 
   ```bash
   curl -X POST http://localhost:3001/api/admin/bingo/sorteios-automaticos -H "Content-Type: application/json" --max-time 60
   ```
   
   **OU** (se preferir usar o script, mas pode ter problemas de permissão):
   ```bash
   bash /app/scripts/cron/bingo-auto-sortear.sh
   ```

3. **Frequency**: 
   ```
   */10 * * * * *
   ```
   - Isso executa **a cada 10 segundos**
   - Se o Coolify não suportar segundos, use: `* * * * *` (a cada minuto)
   - Ou use: `*/1 * * * *` (a cada minuto também)

4. **Timeout (seconds)**: `300` (5 minutos está bom)

5. **Container name**: 
   - **IMPORTANTE**: Deve ser o nome do container da sua aplicação Next.js
   - NÃO use "php" - isso está errado!
   - O nome correto geralmente é algo como: `b88k48gccgkwkg4sko4ssw4c` ou o nome da sua aplicação
   - Para descobrir o nome correto:
     - Vá em "Containers" na sua aplicação no Coolify
     - Veja o nome do container principal (geralmente é o mesmo ID da aplicação)

## 🔄 Alternativas de Frequência

### Opção 1: A cada 10 segundos (Recomendado)
```
*/10 * * * * *
```
- Mais preciso
- Sorteios acontecem quase em tempo real

### Opção 2: A cada 30 segundos
```
*/30 * * * * *
```
- Menos carga no servidor
- Ainda bastante responsivo

### Opção 3: A cada minuto (Se não suportar segundos)
```
* * * * *
```
- Funciona em qualquer sistema
- Menos preciso, mas ainda funcional

## ✅ Verificação

Após salvar, verifique:

1. **Logs do Cron Job**:
   - No Coolify, vá em "Logs" do Scheduled Task
   - Você deve ver execuções regulares

2. **Teste Manual**:
   ```bash
   # No terminal do container (usando curl - recomendado)
   curl -X POST http://localhost:3001/api/admin/bingo/sorteios-automaticos -H "Content-Type: application/json"
   
   # OU usando o script (pode ter problemas de permissão)
   bash /app/scripts/cron/bingo-auto-sortear.sh
   ```

3. **Verificar Sorteios**:
   - Acesse `/admin/bingo`
   - Veja se os números estão sendo sorteados automaticamente
   - Verifique o campo "Próximo Sorteio" nas salas

## 🐛 Troubleshooting

### Cron não está executando

1. Verifique o nome do container:
   ```bash
   # No terminal do Coolify
   docker ps | grep sua-aplicacao
   ```

2. Verifique os logs:
   - No Coolify: "Logs" do Scheduled Task
   - No container: `tail -f /tmp/bingo-auto-sortear.log`

3. Teste o comando manualmente:
   ```bash
   # Usando curl (recomendado)
   docker exec -it NOME_DO_CONTAINER curl -X POST http://localhost:3001/api/admin/bingo/sorteios-automaticos -H "Content-Type: application/json"
   
   # OU usando bash com o script
   docker exec -it NOME_DO_CONTAINER bash /app/scripts/cron/bingo-auto-sortear.sh
   ```

### Erro "Permission denied"

- O script não tem permissão de execução
- **Solução**: Use `curl` diretamente ao invés do script:
  ```bash
  curl -X POST http://localhost:3001/api/admin/bingo/sorteios-automaticos -H "Content-Type: application/json" --max-time 60
  ```
- Ou use `bash` antes do script:
  ```bash
  bash /app/scripts/cron/bingo-auto-sortear.sh
  ```

### Erro "Container not found"

- O nome do container está errado
- Use o nome exato do container da aplicação Next.js
- Não use "php" ou outros nomes genéricos

### Sorteios não estão acontecendo

1. Verifique se a sala está configurada:
   - `emAndamento` = true
   - `sorteioAutomatico` = true
   - `intervaloSorteio` > 0

2. Verifique se a migration foi executada:
   ```bash
   npx prisma migrate deploy
   ```

3. Verifique os logs da API:
   ```bash
   # No terminal do container
   curl -X POST http://localhost:3001/api/admin/bingo/sorteios-automaticos
   ```

## 📝 Notas

- O script usa `localhost:3001` para chamar a API internamente
- Certifique-se de que a variável `API_URL` está configurada corretamente no script
- O timeout de 300 segundos é suficiente para processar múltiplas salas
