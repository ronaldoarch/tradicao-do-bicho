-- Corrigir saldoSacavel negativo (bug em apostas: debitava mais do que o disponível)
-- Usuários com saldoSacavel negativo não podem sacar; zerar para estado consistente
UPDATE "Usuario"
SET "saldoSacavel" = 0
WHERE "saldoSacavel" < 0;
