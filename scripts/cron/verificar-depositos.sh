#!/bin/bash
# Verifica depósitos pendentes (Gatebox) e processa se pagos.
# Fallback quando o webhook não é recebido.
# Executar a cada 1-2 minutos via cron.

BASE_URL="${NEXT_PUBLIC_APP_URL:-https://tradicaodobicho.site}"
SECRET="${CRON_SECRET:-}"

if [ -z "$SECRET" ]; then
  echo "⚠️  CRON_SECRET não definido - a verificação pode falhar por 401"
fi

curl -s "${BASE_URL}/api/cron/verificar-depositos-pendentes?secret=${SECRET}" || true
