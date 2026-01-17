#!/bin/bash
set -e

# Iniciar cron em background (se disponível)
if command -v crond &> /dev/null; then
  echo "🕐 Iniciando cron..."
  crond -f -d 8 &
elif command -v cron &> /dev/null; then
  echo "🕐 Iniciando cron..."
  cron &
fi

# Aguardar um pouco para garantir que o cron iniciou
sleep 2

# Verificar se o cron está rodando
if pgrep -x crond > /dev/null || pgrep -x cron > /dev/null; then
  echo "✅ Cron iniciado com sucesso"
else
  echo "⚠️ Cron não está rodando (pode não estar disponível neste ambiente)"
fi

# Executar comando original (start da aplicação Next.js)
exec "$@"
