# 🚀 Como Implementar o Gatebox - Guia Completo

Este guia passo a passo mostra como configurar e implementar o gateway Gatebox na aplicação.

---

## 📋 Pré-requisitos

1. **Credenciais da Gatebox**
   - Username (geralmente CNPJ): `93892492000158`
   - Password: `@Homolog1` (ou a senha fornecida)
   - Acesso ao painel administrativo da Gatebox

2. **Acesso ao Admin da Aplicação**
   - Conta de administrador configurada
   - Acesso à rota `/admin/gateways`

3. **Informações do Servidor**
   - IP de saída do servidor (para whitelist)
   - URL pública da aplicação (para webhook)

---

## 🔧 Passo 1: Configurar no Painel Admin

### Opção A: Via Interface Admin (Recomendado)

1. **Acesse o painel admin:**
   ```
   https://seu-dominio.com/admin/gateways
   ```

2. **Clique em "+ Novo Gateway"**

3. **Preencha o formulário:**
   - **Nome**: `Gatebox` (ou qualquer nome identificador)
   - **Tipo**: Selecione `Gatebox`
   - **URL Base**: `https://api.gatebox.com.br` (ou URL de homologação se aplicável)
   - **Usuário**: CNPJ ou username fornecido pela Gatebox (ex: `93892492000158`)
   - **Senha**: Senha fornecida pela Gatebox (ex: `@Homolog1`)
   - **Ativo**: ✅ Marque como ativo

4. **Salve a configuração**

### Opção B: Via Variáveis de Ambiente (Alternativa)

Se preferir usar variáveis de ambiente ao invés do painel admin:

```env
# .env ou configuração do Coolify
GATEBOX_USERNAME=93892492000158
GATEBOX_PASSWORD=@Homolog1
GATEBOX_BASE_URL=https://api.gatebox.com.br
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
```

**Nota:** A configuração via Admin tem prioridade sobre variáveis de ambiente.

---

## 🌐 Passo 2: Configurar Webhook no Painel Gatebox

O webhook é **obrigatório** para que os depósitos sejam creditados automaticamente.

1. **Acesse o painel administrativo da Gatebox**

2. **Configure a URL do webhook:**
   ```
   https://seu-dominio.com/api/webhooks/gatebox
   ```
   
   Exemplo:
   ```
   https://tradicaodobicho.site/api/webhooks/gatebox
   ```

3. **Salve a configuração no painel Gatebox**

**⚠️ Importante:**
- O webhook deve ser acessível publicamente (sem autenticação)
- Use HTTPS (não HTTP)
- A URL deve estar correta e acessível

---

## 🔒 Passo 3: Configurar Whitelist de IP (Obrigatório para Saques)

A Gatebox valida o **IP do servidor** que faz as requisições. Você precisa adicionar o IP na whitelist.

### Como descobrir o IP do servidor:

**Método 1: Via Painel Admin**
1. Acesse `Admin → Gateways`
2. Veja a seção "Gatebox: IP para Whitelist"
3. Copie o IP exibido

**Método 2: Via API**
```bash
curl https://seu-dominio.com/api/admin/gatebox/ip
# Requer autenticação admin
```

**Método 3: Via Terminal**
```bash
curl https://api.ipify.org
```

**Método 4: Diagnóstico Completo**
1. Acesse `Admin → Gateways`
2. Clique em "Diagnosticar IP + Gatebox"
3. Veja todos os IPs detectados (IPv4 e IPv6)

### Adicionar IP na Whitelist:

1. **Acesse o painel administrativo da Gatebox**
2. **Vá em "Configurações" → "Whitelist de IP"**
3. **Adicione o IP do servidor**
4. **Salve**

**⚠️ Problemas comuns:**
- Se o servidor tem múltiplos IPs (IPv4 e IPv6), adicione **todos**
- Se ainda der erro após adicionar, use o diagnóstico para ver qual IP a Gatebox está vendo
- Contate o suporte da Gatebox se necessário: *"Qual IP de origem vocês registram quando a requisição ao endpoint POST /v1/customers/pix/withdraw retorna 403?"*

---

## ✅ Passo 4: Testar a Configuração

### Teste 1: Verificar Configuração

1. Acesse `Admin → Gateways`
2. Verifique se o gateway Gatebox está listado e ativo
3. Veja se o IP está sendo detectado corretamente

### Teste 2: Testar Autenticação

1. Acesse `Admin → Gateways`
2. Clique em "Testar Conexão" (se disponível)
3. Ou use o endpoint de diagnóstico:
   ```bash
   GET /api/admin/gatebox/diagnostico
   ```

### Teste 3: Criar Depósito de Teste

1. **Como usuário**, acesse a página de depósito
2. **Selecione Gatebox** como método de pagamento
3. **Informe um valor** (ex: R$ 10,00)
4. **Confirme o depósito**
5. **Verifique se o QR Code é gerado**

### Teste 4: Verificar Webhook

1. **Pague o PIX** gerado (ou simule o pagamento)
2. **Verifique os logs** do servidor para ver se o webhook foi recebido
3. **Confirme** que o saldo foi creditado automaticamente

---

## 🔍 Verificação de Problemas

### Problema: "IP não autorizado" ao fazer saque

**Solução:**
1. Use o diagnóstico para ver todos os IPs detectados
2. Adicione **todos os IPs** na whitelist da Gatebox
3. Verifique se está usando IPv4 ou IPv6
4. Contate o suporte da Gatebox para confirmar qual IP eles veem

### Problema: Webhook não está chegando

**Solução:**
1. Verifique se a URL do webhook está correta no painel Gatebox
2. Verifique se a URL é acessível publicamente:
   ```bash
   curl https://seu-dominio.com/api/webhooks/gatebox
   ```
3. Configure um cron como fallback:
   ```bash
   */2 * * * * curl -s "https://seu-dominio.com/api/cron/verificar-depositos-pendentes?secret=SEU_CRON_SECRET"
   ```

### Problema: Erro 401 - Não autenticado

**Solução:**
1. Verifique se username e password estão corretos
2. Verifique se o gateway está marcado como **ativo**
3. Limpe o cache de token (o sistema faz isso automaticamente em caso de erro)
4. Verifique se as credenciais não expiraram

### Problema: Erro 502 - Serviço não acessível

**Solução:**
1. Verifique se a URL base está correta (`https://api.gatebox.com.br`)
2. Verifique se o serviço Gatebox está online
3. Verifique se há firewall bloqueando a conexão

---

## 📚 Estrutura de Arquivos

A implementação do Gatebox está organizada assim:

```
lib/
  ├── gatebox-client.ts          # Cliente principal da API Gatebox
  └── gateways-store.ts          # Gerenciamento de gateways

app/api/
  ├── deposito/
  │   └── pix-gatebox/route.ts   # Endpoint para criar depósito PIX
  ├── saques/route.ts            # Endpoint para saques (usa Gatebox se ativo)
  ├── webhooks/
  │   └── gatebox/route.ts      # Webhook recebido da Gatebox
  └── admin/
      ├── gatebox/
      │   ├── config/route.ts    # Configuração do Gatebox
      │   ├── ip/route.ts        # Consultar IP do servidor
      │   └── diagnostico/route.ts # Diagnóstico completo
      └── gateways/route.ts      # CRUD de gateways

app/admin/
  └── gateways/page.tsx          # Interface admin para configurar gateways
```

---

## 🔄 Fluxo de Funcionamento

### Depósito (Cash-In)

```
1. Usuário solicita depósito → POST /api/deposito/pix-gatebox
2. Sistema cria transação pendente no banco
3. Sistema autentica na Gatebox → POST /v1/customers/auth/sign-in
4. Sistema gera QR Code PIX → POST /v1/customers/pix/create-immediate-qrcode
5. Usuário paga o PIX
6. Gatebox envia webhook → POST /api/webhooks/gatebox
7. Sistema processa depósito e credita saldo
8. Bônus é aplicado conforme promoções ativas
```

### Saque (Cash-Out)

```
1. Usuário solicita saque → POST /api/saques
2. Sistema valida saldo e cria registro de saque
3. Sistema autentica na Gatebox → POST /v1/customers/auth/sign-in
4. Sistema realiza saque → POST /v1/customers/pix/withdraw
5. Gatebox processa o PIX
6. Gatebox envia webhook → POST /api/webhooks/gatebox
7. Sistema atualiza status do saque (aprovado/rejeitado)
```

---

## 📝 Exemplo de Uso via API

### Criar Depósito

```typescript
const response = await fetch('/api/deposito/pix-gatebox', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': 'lotbicho_session=...'
  },
  body: JSON.stringify({
    valor: 100.00,
    document: '12345678901' // CPF (opcional)
  })
})

const data = await response.json()
// data.qrCode - QR Code em base64
// data.qrCodeText - Texto do QR Code para copiar
// data.transactionId - ID da transação
```

### Realizar Saque

```typescript
const response = await fetch('/api/saques', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': 'lotbicho_session=...'
  },
  body: JSON.stringify({
    valor: 50.00,
    chavePix: '+5514999999999' // Chave PIX do recebedor
  })
})
```

---

## 🔐 Segurança

1. **Senhas são criptografadas** antes de salvar no banco
2. **Tokens são cacheados** e renovados automaticamente
3. **Webhooks não requerem autenticação** (validação via payload)
4. **IP é validado** pela Gatebox para saques

---

## 📞 Suporte

Se encontrar problemas:

1. **Verifique os logs** do servidor
2. **Use o diagnóstico** em `Admin → Gateways → Diagnosticar IP + Gatebox`
3. **Consulte a documentação** da Gatebox
4. **Entre em contato** com o suporte da Gatebox se necessário

---

## ✅ Checklist Final

- [ ] Credenciais configuradas no Admin → Gateways
- [ ] Gateway marcado como **ativo**
- [ ] Webhook configurado no painel Gatebox
- [ ] IP do servidor adicionado na whitelist da Gatebox
- [ ] Teste de depósito funcionando
- [ ] Teste de saque funcionando (se aplicável)
- [ ] Webhook recebendo notificações corretamente

---

**Pronto!** O Gatebox está implementado e configurado. 🎉
