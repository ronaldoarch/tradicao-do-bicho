FROM node:20-bullseye-slim

WORKDIR /app

# Criar diretório para uploads (será montado como volume)
RUN mkdir -p /app/public/uploads/banners /app/public/uploads/logos /app/public/uploads/stories

# Copiar arquivos de dependências
COPY package.json package-lock.json* ./

# Instalar dependências do sistema necessárias (openssl, curl, cron)
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates curl cron \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependências sem rodar scripts (evita prisma generate antes do schema)
RUN npm ci --ignore-scripts

# Copiar arquivos do projeto
COPY . .

# Copiar scripts de cron
COPY scripts/cron/liquidar.sh /app/scripts/cron/liquidar.sh
COPY scripts/cron/descarga-relatorio.sh /app/scripts/cron/descarga-relatorio.sh
COPY scripts/cron/bingo-auto-sortear.sh /app/scripts/cron/bingo-auto-sortear.sh
RUN chmod +x /app/scripts/cron/liquidar.sh
RUN chmod +x /app/scripts/cron/descarga-relatorio.sh
RUN chmod +x /app/scripts/cron/bingo-auto-sortear.sh

# Configurar crontab
RUN echo "*/5 * * * * /app/scripts/cron/liquidar.sh >> /var/log/liquidar.log 2>&1" | crontab - && \
    echo "* * * * * /app/scripts/cron/descarga-relatorio.sh >> /var/log/descarga-relatorio.log 2>&1" | crontab -

# Criar diretório de logs
RUN mkdir -p /var/log && touch /var/log/liquidar.log && touch /var/log/descarga-relatorio.log

# Script de inicialização
COPY scripts/start-with-cron.sh /app/scripts/start-with-cron.sh
RUN chmod +x /app/scripts/start-with-cron.sh

# Gerar Prisma Client e fazer build
RUN npx prisma generate && npm run build

EXPOSE 3001

ENV PORT=3001
ENV NODE_ENV=production

# Garantir que os diretórios de upload existam (volume será montado aqui)
VOLUME ["/app/public/uploads"]

CMD ["/app/scripts/start-with-cron.sh", "npm", "start"]
