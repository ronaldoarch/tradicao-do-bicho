-- CreateTable
CREATE TABLE IF NOT EXISTS "ConfiguracaoPromotor" (
    "id" SERIAL NOT NULL,
    "percentualPrimeiroDep" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracaoPromotor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Indicacao" (
    "id" SERIAL NOT NULL,
    "promotorId" INTEGER NOT NULL,
    "indicadoId" INTEGER NOT NULL,
    "primeiroDepositoValor" DOUBLE PRECISION,
    "bonusPago" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dataPrimeiroDeposito" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Indicacao_pkey" PRIMARY KEY ("id")
);

-- AlterTable Usuario
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Usuario' AND column_name = 'isPromotor') THEN
    ALTER TABLE "Usuario" ADD COLUMN "isPromotor" BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Usuario' AND column_name = 'codigoPromotor') THEN
    ALTER TABLE "Usuario" ADD COLUMN "codigoPromotor" TEXT;
  END IF;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Indicacao_indicadoId_key" ON "Indicacao"("indicadoId");
CREATE INDEX IF NOT EXISTS "Indicacao_promotorId_idx" ON "Indicacao"("promotorId");
CREATE INDEX IF NOT EXISTS "Indicacao_indicadoId_idx" ON "Indicacao"("indicadoId");

CREATE UNIQUE INDEX IF NOT EXISTS "Usuario_codigoPromotor_key" ON "Usuario"("codigoPromotor");
CREATE INDEX IF NOT EXISTS "Usuario_codigoPromotor_idx" ON "Usuario"("codigoPromotor");
CREATE INDEX IF NOT EXISTS "Usuario_isPromotor_idx" ON "Usuario"("isPromotor");

-- AddForeignKey
ALTER TABLE "Indicacao" ADD CONSTRAINT "Indicacao_promotorId_fkey" FOREIGN KEY ("promotorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Indicacao" ADD CONSTRAINT "Indicacao_indicadoId_fkey" FOREIGN KEY ("indicadoId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
