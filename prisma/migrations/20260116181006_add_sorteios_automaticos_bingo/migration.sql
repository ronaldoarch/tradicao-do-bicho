-- AlterTable
ALTER TABLE "SalaBingo" ADD COLUMN "sorteioAutomatico" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "intervaloSorteio" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN "proximoSorteio" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "SalaBingo_emAndamento_sorteioAutomatico_idx" ON "SalaBingo"("emAndamento", "sorteioAutomatico");
