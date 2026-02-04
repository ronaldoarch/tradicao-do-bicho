# Guia de Deploy - Tradição do Bicho

## Configuração do Banco de Dados PostgreSQL

O projeto está configurado para usar PostgreSQL via Prisma ORM.

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com a seguinte variável:

```env
DATABASE_URL="postgres://postgres:yCPyJwFfLC6HeeSD2ss9yU7o6j3TaF2GqKBtQ1bg8anJelXt97hrByFKpbsP9iKg@kwc00sowkos44gw0kk88www0:5432/postgres"
```

### Comandos do Prisma

1. **Gerar o cliente Prisma:**
   ```bash
   npm run prisma:generate
   ```

2. **Criar as tabelas no banco de dados:**
   ```bash
   npm run prisma:push
   ```
   
   Ou criar uma migration:
   ```bash
   npm run prisma:migrate
   ```

3. **Abrir Prisma Studio (opcional):**
   ```bash
   npm run prisma:studio
   ```

### Deploy no Colify

#### Opção 1: Deploy com Dockerfile Customizado (Recomendado)

1. **Configure a variável de ambiente `DATABASE_URL`** no painel do Coolify com a URL do PostgreSQL:
   ```
   postgres://postgres:yCPyJwFfLC6HeeSD2ss9yU7o6j3TaF2GqKBtQ1bg8anJelXt97hrByFKpbsP9iKg@kwc00sowkos44gw0kk88www0:5432/postgres
   ```

2. **Configure o Volume Persistente** (IMPORTANTE para manter uploads):
   - Vá em **"Configuration"** → **"Persistent Storage"**
   - Clique em **"+ Add"** → **"Directory Mount"**
   - Configure:
     - **Source Path**: `/uploads-storage`
     - **Destination Path**: `/app/public/uploads`
     - **Size**: 5GB (ou o necessário)
   - Salve e reinicie a aplicação

3. **Para usar Dockerfile customizado** (opcional):
   - O Colify detecta automaticamente o `Dockerfile` na raiz do projeto
   - Se preferir, pode desabilitar o Nixpacks nas configurações avançadas
   - O Dockerfile já está configurado com suporte a volumes persistentes

4. **Faça o deploy normalmente** - o Dockerfile vai:
   - Criar diretórios de upload automaticamente
   - Instalar dependências (`npm ci`)
   - Gerar o Prisma Client e fazer build
   - Configurar volume para uploads

3. **Após o primeiro deploy, rode no terminal do Colify** (apenas uma vez):
   ```bash
   npm run init:db
   ```
   Ou diretamente:
   ```bash
   npm run prisma:push
   ```
   Isso cria todas as tabelas no banco de dados.
   
   **IMPORTANTE:** Execute este comando no terminal do Colify após o primeiro deploy bem-sucedido. Você pode acessar o terminal através da aba "Terminal" no painel do Colify.

#### Opção 2: Testar Localmente Primeiro (Opcional)

Se quiser testar localmente antes:

1. **Crie o arquivo `.env`** na raiz com:
   ```env
   DATABASE_URL="postgres://postgres:yCPyJwFfLC6HeeSD2ss9yU7o6j3TaF2GqKBtQ1bg8anJelXt97hrByFKpbsP9iKg@kwc00sowkos44gw0kk88www0:5432/postgres"
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Crie as tabelas no banco:**
   ```bash
   npm run prisma:push
   ```

4. **Teste localmente:**
   ```bash
   npm run dev
   ```

5. **Depois faça o deploy no Colify** - só precisa rodar `prisma:push` uma vez no terminal do Colify após o primeiro deploy.

### Estrutura do Banco de Dados

O schema do Prisma inclui as seguintes tabelas:

- **Banner**: Banners promocionais
- **Story**: Stories do Instagram
- **Modalidade**: Modalidades de apostas
- **Promocao**: Promoções e bônus
- **Extracao**: Extrações de resultados
- **Cotacao**: Cotações
- **Tema**: Temas personalizáveis
- **Configuracao**: Configurações gerais da plataforma
- **Usuario**: Usuários do sistema
- **Saque**: Solicitações de saque

### Configuração de Storage para Imagens

**IMPORTANTE:** Os arquivos de upload (banners, logos, stories) são salvos em `public/uploads/`. Em containers Docker, esses arquivos são perdidos quando o container reinicia.

📖 **Guia Completo:** Veja [docs/STORAGE_PERSISTENTE.md](./docs/STORAGE_PERSISTENTE.md) para instruções detalhadas.

#### Opção 1: Volume Persistente (Recomendado)

1. No painel do Coolify, vá em **"Configuration"** → **"Persistent Storage"**
2. Clique em **"+ Add Volume"**
3. Configure:
   - **Name**: `uploads-storage` (ou qualquer nome)
   - **Mount Path**: `/app/public/uploads` ⚠️ **Deve ser exatamente este caminho**
   - **Size**: 5GB (ou o necessário)
   - **Type**: `Directory Mount`
4. Salve e reinicie a aplicação

Isso garantirá que os arquivos de upload sejam persistidos mesmo quando o container reiniciar.

#### Opção 2: Storage Externo (Melhor para Produção)

Para uma solução mais robusta, considere usar:
- AWS S3
- Cloudflare R2
- DigitalOcean Spaces
- DigitalOcean Spaces
- Google Cloud Storage

### Notas Importantes

- O arquivo `.env` não deve ser commitado no Git (já está no `.gitignore`)
- Use `.env.example` como referência para outras variáveis de ambiente
- O Prisma Client é gerado automaticamente durante o build (`npm run build`)
- Certifique-se de que a URL do banco de dados está correta e acessível do servidor de deploy
- **Configure um volume persistente** para evitar perda de arquivos de upload ao reiniciar o container