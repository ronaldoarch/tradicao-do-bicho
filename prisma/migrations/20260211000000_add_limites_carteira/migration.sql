-- AlterTable
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Configuracao' AND column_name = 'limiteSaqueMinimo') THEN
    ALTER TABLE "Configuracao" ADD COLUMN "limiteSaqueMinimo" DOUBLE PRECISION NOT NULL DEFAULT 30;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Configuracao' AND column_name = 'limiteSaqueMaximo') THEN
    ALTER TABLE "Configuracao" ADD COLUMN "limiteSaqueMaximo" DOUBLE PRECISION NOT NULL DEFAULT 10000;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Configuracao' AND column_name = 'limiteDepositoMinimo') THEN
    ALTER TABLE "Configuracao" ADD COLUMN "limiteDepositoMinimo" DOUBLE PRECISION NOT NULL DEFAULT 25;
  END IF;
END $$;
