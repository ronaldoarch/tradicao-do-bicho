#!/bin/bash
# Corrige P3009: migração falhou no banco de produção
# Execute: ./scripts/fix-migration-p3009.sh
# Ou com DATABASE_URL: DATABASE_URL="postgresql://..." ./scripts/fix-migration-p3009.sh

set -e
echo "🔧 Resolvendo migração falhada (P3009)..."

npx prisma migrate resolve --applied "20250124000000_add_configuracao_gatebox" 2>/dev/null || true
npx prisma migrate resolve --applied "20250124000001_update_gateway_model" 2>/dev/null || true
npx prisma migrate resolve --applied "20260129000000_add_configuracao_frk" 2>/dev/null || true

echo "🔄 Aplicando migrações pendentes..."
npx prisma migrate deploy

echo "✅ Pronto!"
