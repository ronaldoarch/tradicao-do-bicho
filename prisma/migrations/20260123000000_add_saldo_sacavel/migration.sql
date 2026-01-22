-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "saldoSacavel" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Atualizar saldoSacavel existente: considerar apenas prêmios já recebidos
-- (assumindo que prêmios foram creditados no saldo, vamos inicializar com 0)
-- O saldoSacavel será atualizado automaticamente quando novos prêmios forem creditados
