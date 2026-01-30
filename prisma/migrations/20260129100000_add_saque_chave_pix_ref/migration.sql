-- AlterTable
ALTER TABLE "Saque" ADD COLUMN "chavePix" TEXT;
ALTER TABLE "Saque" ADD COLUMN "referenciaExterna" TEXT;

-- CreateIndex
CREATE INDEX "Saque_referenciaExterna_idx" ON "Saque"("referenciaExterna");
