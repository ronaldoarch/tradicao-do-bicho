#!/bin/bash
set -e

# Garantir que o diretório de uploads exista e tenha subpastas
# (volume persistente monta em /app/public/uploads - precisa das subpastas)
UPLOADS_DIR="/app/public/uploads"
if [ -d "$UPLOADS_DIR" ]; then
  mkdir -p "$UPLOADS_DIR/banners" "$UPLOADS_DIR/logos" "$UPLOADS_DIR/stories"
  chmod -R 755 "$UPLOADS_DIR" 2>/dev/null || true
  echo "✅ Diretório de uploads inicializado: $UPLOADS_DIR"
else
  mkdir -p "$UPLOADS_DIR"/{banners,logos,stories}
  echo "✅ Diretório de uploads criado: $UPLOADS_DIR"
fi

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
