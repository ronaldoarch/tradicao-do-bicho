#!/bin/bash

# Script de liquidação automática de apostas
# Executa a liquidação de apostas pendentes via API
#
# Em produção, defina API_URL com a URL do app, ex.:
#   export API_URL=https://tradicaodobicho.site
# Ou no cron: API_URL=https://tradicaodobicho.site ./liquidar.sh

# Configurações
API_URL="${API_URL:-http://localhost:3001}"
LOG_FILE="${LOG_FILE:-/var/log/liquidar.log}"

# Função para log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE" 2>&1
}

# Verificar se a API está disponível
log "Iniciando liquidação automática..."
log "API URL: $API_URL"

# Executar liquidação com timeout de 120 segundos
RESPONSE=$(curl -f -s --max-time 120 -X POST "$API_URL/api/resultados/liquidar" \
    -H "Content-Type: application/json" \
    -d '{"usarMonitor": false}' \
    -w "\nHTTP_CODE:%{http_code}" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2 || echo "000")
BODY=$(echo "$RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')

if [ "$HTTP_CODE" = "200" ]; then
    log "✅ Liquidação executada com sucesso"
    log "Resposta: $BODY"
    
    # Extrair estatísticas da resposta JSON
    PROCESSADAS=$(echo "$BODY" | grep -o '"processadas":[0-9]*' | cut -d: -f2 || echo "0")
    LIQUIDADAS=$(echo "$BODY" | grep -o '"liquidadas":[0-9]*' | cut -d: -f2 || echo "0")
    PREMIO=$(echo "$BODY" | grep -o '"premioTotal":[0-9.]*' | cut -d: -f2 || echo "0")
    
    log "Estatísticas: Processadas=$PROCESSADAS | Liquidadas=$LIQUIDADAS | Prêmio Total=R$ $PREMIO"
    exit 0
else
    log "❌ Erro ao executar liquidação (HTTP $HTTP_CODE)"
    log "Resposta: $BODY"
    exit 1
fi
