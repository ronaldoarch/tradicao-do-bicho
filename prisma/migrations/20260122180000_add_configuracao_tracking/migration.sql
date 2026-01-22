-- CreateTable
CREATE TABLE IF NOT EXISTS "ConfiguracaoTracking" (
    "id" SERIAL NOT NULL,
    "facebookPixelId" TEXT,
    "facebookAccessToken" TEXT,
    "webhookUrl" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracaoTracking_pkey" PRIMARY KEY ("id")
);
