#!/bin/bash

# Script para verificar e enviar relatórios de descarga automaticamente
# Deve ser executado a cada minuto via cron

API_URL="${API_URL:-http://localhost:3000}"
CRON_SECRET_TOKEN="${CRON_SECRET_TOKEN:-seu_token_secreto_aqui}"
LOG_FILE="/var/log/descarga-relatorio.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Iniciando verificação de relatórios de descarga..."

# Fazer requisição para API
response=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CRON_SECRET_TOKEN" \
  "$API_URL/api/admin/descarga/verificar-e-enviar")

# Separar corpo e código HTTP
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
  log "Verificação concluída: $body"
else
  log "Erro na verificação (HTTP $http_code): $body"
fi
