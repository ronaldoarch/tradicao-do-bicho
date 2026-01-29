-- CreateTable
CREATE TABLE "Cotada" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "modalidade" TEXT NOT NULL,
    "cotacao" DOUBLE PRECISION NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cotada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cotada_numero_modalidade_key" ON "Cotada"("numero", "modalidade");

-- CreateIndex
CREATE INDEX "Cotada_modalidade_idx" ON "Cotada"("modalidade");

-- CreateIndex
CREATE INDEX "Cotada_ativo_idx" ON "Cotada"("ativo");
