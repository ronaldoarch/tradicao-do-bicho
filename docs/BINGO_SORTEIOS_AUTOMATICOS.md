# 🎲 Sistema de Sorteios Automáticos de Bingo

## Visão Geral

O sistema permite configurar sorteios automáticos para salas de bingo, onde os números são sorteados automaticamente em intervalos configuráveis.

## Funcionalidades

- ✅ Configuração de sorteios automáticos por sala
- ✅ Intervalo configurável entre sorteios (5-300 segundos)
- ✅ Execução automática via cron job
- ✅ Verificação automática de ganhadores após cada sorteio
- ✅ Desativação automática quando todos os números são sorteados

## Como Configurar

### 1. No Admin (`/admin/bingo`)

1. Crie ou edite uma sala de bingo
2. Na seção "Configuração de Sorteios Automáticos":
   - Marque "Ativar Sorteios Automáticos"
   - Configure o "Intervalo entre Sorteios" (em segundos)
3. Salve a sala
4. Ao iniciar a sala, os sorteios automáticos serão ativados

### 2. Configurar Cron Job no Coolify

#### Opção 1: Via Interface do Coolify (Recomendado)

1. Acesse o painel do Coolify
2. Vá para sua aplicação
3. Clique em **"Scheduled Tasks"** ou **"Cron Jobs"**
4. Clique em **"+ Add Scheduled Task"**
5. Configure:
   - **Name**: `Sorteios Automáticos Bingo`
   - **Schedule**: `*/10 * * * * *` (a cada 10 segundos) ou `*/30 * * * * *` (a cada 30 segundos)
   - **Command**: 
     ```bash
     /app/scripts/cron/bingo-auto-sortear.sh
     ```
   - **Container**: Selecione o container da aplicação

#### Opção 2: Via Terminal

```bash
# Editar crontab
crontab -e

# Adicionar linha (executa a cada 10 segundos)
*/10 * * * * * /app/scripts/cron/bingo-auto-sortear.sh >> /tmp/bingo-auto-sortear.log 2>&1
```

### 3. Variáveis de Ambiente

Certifique-se de que estas variáveis estão configuradas:

```env
API_URL=http://localhost:3001  # URL interna da API
LOG_FILE=/tmp/bingo-auto-sortear.log  # Arquivo de log (opcional)
```

## Como Funciona

1. **Cron Job executa** a cada X segundos (configurável)
2. **Chama** `POST /api/admin/bingo/sorteios-automaticos`
3. **Busca** salas em andamento com sorteio automático ativo
4. **Verifica** se é hora de sortear (baseado em `proximoSorteio`)
5. **Sorteia** um número aleatório
6. **Atualiza** a sala com o novo número
7. **Calcula** próximo sorteio baseado no intervalo
8. **Verifica** ganhadores automaticamente
9. **Desativa** sorteio automático quando todos os 75 números são sorteados

## API Endpoints

### POST `/api/admin/bingo/sorteios-automaticos`

Executa sorteios automáticos para todas as salas que precisam.

**Resposta de sucesso:**
```json
{
  "message": "Processadas 2 sala(s)",
  "salasProcessadas": 2,
  "resultados": [
    {
      "salaId": 1,
      "salaNome": "Sala Principal",
      "numeroSorteado": 42,
      "totalSorteados": 15,
      "ganhadores": {
        "linha": [],
        "coluna": [],
        "diagonal": [],
        "bingo": []
      },
      "proximoSorteio": "2024-01-16T18:00:30.000Z"
    }
  ],
  "timestamp": "2024-01-16T18:00:20.000Z"
}
```

### GET `/api/admin/bingo/sorteios-automaticos`

Retorna status dos sorteios automáticos (requer autenticação admin).

## Monitoramento

### Ver logs

```bash
# Ver logs do script
tail -f /tmp/bingo-auto-sortear.log

# Ver logs da aplicação
pm2 logs tradicao-do-bicho --lines 50
```

### Testar manualmente

```bash
# Testar endpoint de sorteios automáticos
curl -X POST http://localhost:3001/api/admin/bingo/sorteios-automaticos \
  -H "Content-Type: application/json"

# Ver status
curl http://localhost:3001/api/admin/bingo/sorteios-automaticos
```

## Configurações Recomendadas

### Intervalo de 10 segundos
- **Cron**: `*/10 * * * * *`
- **Intervalo Sala**: 10-30 segundos
- **Uso**: Bingo rápido, mais interativo

### Intervalo de 30 segundos
- **Cron**: `*/30 * * * * *`
- **Intervalo Sala**: 30-60 segundos
- **Uso**: Bingo padrão, balanceado

### Intervalo de 60 segundos
- **Cron**: `*/60 * * * * *` ou `* * * * *`
- **Intervalo Sala**: 60-120 segundos
- **Uso**: Bingo mais lento, mais tempo para análise

## Troubleshooting

### Sorteios não estão acontecendo

1. Verifique se o cron job está rodando:
   ```bash
   crontab -l
   ps aux | grep cron
   ```

2. Verifique os logs:
   ```bash
   tail -f /tmp/bingo-auto-sortear.log
   ```

3. Teste manualmente:
   ```bash
   /app/scripts/cron/bingo-auto-sortear.sh
   ```

4. Verifique se a sala está configurada corretamente:
   - `emAndamento` = true
   - `sorteioAutomatico` = true
   - `intervaloSorteio` > 0

### Erro de conexão

- Verifique se `API_URL` está configurada corretamente
- Para scripts dentro do container: Use `localhost:3001`
- Para scripts externos: Use a URL pública completa

### Sorteios muito rápidos/lentos

- Ajuste o `intervaloSorteio` na configuração da sala
- Ajuste a frequência do cron job

## Notas Importantes

- O cron job executa dentro do container da aplicação
- Use `localhost:3001` para requisições internas
- O sistema verifica automaticamente se é hora de sortear
- Sorteios automáticos são desativados quando todos os 75 números são sorteados
- O sistema verifica ganhadores automaticamente após cada sorteio
