#!/bin/bash

# Script para corrigir problema de migração quando shadow database não tem tabelas

echo "🔧 Corrigindo migração do Prisma..."

# Opção 1: Marcar migração anterior como aplicada (se já foi aplicada no banco)
echo "Marcando migração anterior como aplicada..."
npx prisma migrate resolve --applied 20260116181006_add_sorteios_automaticos_bingo || echo "Migração já marcada ou não encontrada"

# Opção 2: Criar nova migração
echo "Criando nova migração..."
npx prisma migrate dev --name add_configuracao_descarga --create-only

echo "✅ Pronto! Agora você pode revisar a migração e aplicar com: npx prisma migrate deploy"
