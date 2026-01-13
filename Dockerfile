FROM node:20-bullseye-slim

WORKDIR /app

# Criar diretório para uploads (será montado como volume)
RUN mkdir -p /app/public/uploads/banners /app/public/uploads/logos /app/public/uploads/stories

# Copiar arquivos de dependências
COPY package.json package-lock.json* ./

# Instalar dependências do sistema necessárias (openssl, curl)
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependências sem rodar scripts (evita prisma generate antes do schema)
RUN npm ci --ignore-scripts

# Copiar arquivos do projeto
COPY . .

# Gerar Prisma Client e fazer build
RUN npx prisma generate && npm run build

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

# Garantir que os diretórios de upload existam (volume será montado aqui)
VOLUME ["/app/public/uploads"]

CMD ["npm", "start"]
