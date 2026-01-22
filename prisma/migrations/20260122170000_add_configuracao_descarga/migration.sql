-- CreateTable
CREATE TABLE IF NOT EXISTS "ConfiguracaoDescarga" (
    "id" SERIAL NOT NULL,
    "whatsappNumero" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "minutosAntesFechamento" INTEGER NOT NULL DEFAULT 10,
    "ultimoEnvio" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracaoDescarga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LimiteDescarga" (
    "id" SERIAL NOT NULL,
    "modalidade" TEXT NOT NULL,
    "premio" INTEGER NOT NULL,
    "limite" DOUBLE PRECISION NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "loteria" TEXT NOT NULL DEFAULT '',
    "horario" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LimiteDescarga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "NumeroBloqueado" (
    "id" SERIAL NOT NULL,
    "modalidade" TEXT NOT NULL,
    "premio" INTEGER NOT NULL,
    "numero" TEXT NOT NULL,
    "loteria" TEXT NOT NULL,
    "horario" TEXT NOT NULL,
    "valorAtual" DOUBLE PRECISION NOT NULL,
    "limite" DOUBLE PRECISION NOT NULL,
    "bloqueadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NumeroBloqueado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AlertaDescarga" (
    "id" SERIAL NOT NULL,
    "modalidade" TEXT NOT NULL,
    "premio" INTEGER NOT NULL,
    "limite" DOUBLE PRECISION NOT NULL,
    "totalApostado" DOUBLE PRECISION NOT NULL,
    "excedente" DOUBLE PRECISION NOT NULL,
    "dataConcurso" TIMESTAMP(3),
    "resolvido" BOOLEAN NOT NULL DEFAULT false,
    "resolvidoEm" TIMESTAMP(3),
    "resolvidoPor" INTEGER,
    "loteria" TEXT,
    "horario" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertaDescarga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WebhookEvent" (
    "id" SERIAL NOT NULL,
    "source" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "headers" JSONB,
    "status" TEXT NOT NULL DEFAULT 'received',
    "statusCode" INTEGER,
    "response" JSONB,
    "error" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "FacebookEvent" (
    "id" SERIAL NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventId" TEXT,
    "pixelId" TEXT,
    "userData" JSONB,
    "customData" JSONB,
    "value" DOUBLE PRECISION,
    "currency" TEXT,
    "sourceUrl" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "status" TEXT NOT NULL DEFAULT 'received',
    "error" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacebookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LimiteDescarga_modalidade_idx" ON "LimiteDescarga"("modalidade");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LimiteDescarga_loteria_horario_premio_idx" ON "LimiteDescarga"("loteria", "horario", "premio");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LimiteDescarga_modalidade_premio_loteria_horario_key" ON "LimiteDescarga"("modalidade", "premio", "loteria", "horario");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NumeroBloqueado_modalidade_premio_loteria_horario_idx" ON "NumeroBloqueado"("modalidade", "premio", "loteria", "horario");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NumeroBloqueado_numero_idx" ON "NumeroBloqueado"("numero");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "NumeroBloqueado_modalidade_premio_numero_loteria_horario_key" ON "NumeroBloqueado"("modalidade", "premio", "numero", "loteria", "horario");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AlertaDescarga_modalidade_premio_idx" ON "AlertaDescarga"("modalidade", "premio");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AlertaDescarga_resolvido_idx" ON "AlertaDescarga"("resolvido");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AlertaDescarga_dataConcurso_idx" ON "AlertaDescarga"("dataConcurso");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WebhookEvent_source_idx" ON "WebhookEvent"("source");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WebhookEvent_eventType_idx" ON "WebhookEvent"("eventType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WebhookEvent_status_idx" ON "WebhookEvent"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WebhookEvent_createdAt_idx" ON "WebhookEvent"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FacebookEvent_eventName_idx" ON "FacebookEvent"("eventName");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FacebookEvent_pixelId_idx" ON "FacebookEvent"("pixelId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FacebookEvent_status_idx" ON "FacebookEvent"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FacebookEvent_createdAt_idx" ON "FacebookEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "FacebookEvent_eventId_key" ON "FacebookEvent"("eventId");

-- AlterTable (adicionar campos ao Usuario se não existirem)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Usuario' AND column_name = 'cpf') THEN
        ALTER TABLE "Usuario" ADD COLUMN "cpf" TEXT;
        CREATE UNIQUE INDEX IF NOT EXISTS "Usuario_cpf_key" ON "Usuario"("cpf");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Usuario' AND column_name = 'admin') THEN
        ALTER TABLE "Usuario" ADD COLUMN "admin" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- AlterTable (adicionar campos ao SalaBingo se não existirem)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SalaBingo' AND column_name = 'sorteioAutomatico') THEN
        ALTER TABLE "SalaBingo" ADD COLUMN "sorteioAutomatico" BOOLEAN NOT NULL DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SalaBingo' AND column_name = 'intervaloSorteio') THEN
        ALTER TABLE "SalaBingo" ADD COLUMN "intervaloSorteio" INTEGER NOT NULL DEFAULT 30;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SalaBingo' AND column_name = 'proximoSorteio') THEN
        ALTER TABLE "SalaBingo" ADD COLUMN "proximoSorteio" TIMESTAMP(3);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SalaBingo' AND column_name = 'usuariosFakeVencedores') THEN
        ALTER TABLE "SalaBingo" ADD COLUMN "usuariosFakeVencedores" JSONB;
    END IF;
END $$;

-- CreateIndex para SalaBingo se não existirem
CREATE INDEX IF NOT EXISTS "SalaBingo_emAndamento_sorteioAutomatico_idx" ON "SalaBingo"("emAndamento", "sorteioAutomatico");
