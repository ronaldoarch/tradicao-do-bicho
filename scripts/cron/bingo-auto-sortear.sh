#!/bin/bash
# Script para executar sorteios automáticos de bingo
# Deve ser executado a cada 10 segundos (ou conforme necessário)

API_URL="${API_URL:-http://localhost:3001}"
LOG_FILE="${LOG_FILE:-/tmp/bingo-auto-sortear.log}"

DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Criar diretório de logs se não existir
mkdir -p $(dirname "$LOG_FILE")

# Executar sorteios automáticos
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$API_URL/api/admin/bingo/sorteios-automaticos" \
  -H "Content-Type: application/json" \
  -w "\nHTTP_CODE:%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | grep -oP 'HTTP_CODE:\K\d+' | tail -1)
BODY=$(echo "$RESPONSE" | sed 's/HTTP_CODE:.*//')

if [ "$HTTP_CODE" = "200" ]; then
  SALAS_PROCESSADAS=$(echo "$BODY" | grep -oP '"salasProcessadas":\K\d+' || echo "0")
  if [ "$SALAS_PROCESSADAS" != "0" ]; then
    echo "[$DATE] ✅ Sorteios automáticos executados: $SALAS_PROCESSADAS sala(s) processada(s)" >> "$LOG_FILE"
  fi
else
  echo "[$DATE] ❌ Erro ao executar sorteios automáticos (HTTP $HTTP_CODE): $BODY" >> "$LOG_FILE"
fi
