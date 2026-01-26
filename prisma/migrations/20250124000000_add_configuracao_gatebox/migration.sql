-- CreateTable
CREATE TABLE "ConfiguracaoGatebox" (
    "id" SERIAL NOT NULL,
    "username" TEXT,
    "password" TEXT,
    "baseUrl" TEXT NOT NULL DEFAULT 'https://api.gatebox.com.br',
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracaoGatebox_pkey" PRIMARY KEY ("id")
);
