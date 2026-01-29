-- CreateTable
CREATE TABLE "ConfiguracaoFrk" (
    "id" SERIAL NOT NULL,
    "baseUrl" TEXT NOT NULL DEFAULT 'https://frkentrypoint.com/ws.svc',
    "grant" TEXT,
    "codigoIntegrador" TEXT,
    "sistemaId" INTEGER NOT NULL DEFAULT 9,
    "clienteId" INTEGER,
    "bancaId" INTEGER,
    "chrSerial" TEXT,
    "chrCodigoPonto" TEXT,
    "chrCodigoOperador" TEXT,
    "vchVersaoTerminal" TEXT NOT NULL DEFAULT '1.0.0',
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracaoFrk_pkey" PRIMARY KEY ("id")
);
