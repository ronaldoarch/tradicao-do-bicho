-- AlterTable: Adicionar campos para suportar Gatebox
ALTER TABLE "Gateway" 
ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'suitpay',
ADD COLUMN IF NOT EXISTS "username" TEXT,
ADD COLUMN IF NOT EXISTS "password" TEXT;

-- Atualizar gateways existentes para tipo suitpay
UPDATE "Gateway" SET "type" = 'suitpay' WHERE "type" IS NULL;
