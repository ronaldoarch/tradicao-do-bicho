-- Corrigir saldoSacavel negativo ou menor que saldo (bug em apostas)
-- Quando saldoSacavel < saldo: tratar todo o saldo como sacável (depósitos e prêmios)
-- Assim depósitos feitos pelo usuário ficam disponíveis para saque
UPDATE "Usuario"
SET "saldoSacavel" = "saldo"
WHERE "saldoSacavel" < "saldo" AND "saldo" > 0;
