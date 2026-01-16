# Como Adicionar Saldo ao Usuário Admin (ID 1)

## Opção 1: Via Interface Admin (Mais Fácil)

1. Acesse `/admin/usuarios` no painel admin
2. Encontre o usuário de ID 1
3. Clique em "Adicionar Saldo" ou use a funcionalidade de edição de saldo
4. Digite o valor: `100`
5. Confirme

## Opção 2: Via API (Usando cURL)

### Passo 1: Obter o token de autenticação admin

1. Faça login no admin (`/admin/login`)
2. Abra o DevTools (F12)
3. Vá em Application → Cookies
4. Copie o valor do cookie `admin_session`

### Passo 2: Executar o comando

```bash
curl -X POST "https://b88k48gccgkwkg4sko4ssw4c.agenciamidas.com/api/admin/usuarios/1/saldo" \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_session=SEU_TOKEN_AQUI" \
  -d '{
    "valor": 100,
    "descricao": "Depósito manual"
  }'
```

Substitua `SEU_TOKEN_AQUI` pelo token copiado no passo 1.

## Opção 3: Via Script Node.js

```bash
# Defina o token de autenticação
export ADMIN_SESSION_TOKEN=seu_token_aqui

# Execute o script
npx tsx scripts/add-saldo-api.ts 1 100 https://b88k48gccgkwkg4sko4ssw4c.agenciamidas.com
```

## Opção 4: Via Prisma Studio (Se tiver acesso ao banco)

1. Execute `npx prisma studio`
2. Abra a tabela `Usuario`
3. Encontre o usuário ID 1
4. Edite o campo `saldo` e adicione 100 ao valor atual
5. Salve
