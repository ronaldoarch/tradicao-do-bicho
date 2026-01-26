# Integração Gatebox Gateway

Este documento descreve a integração com o gateway de pagamento Gatebox para processar depósitos PIX.

## Variáveis de Ambiente Necessárias

Adicione as seguintes variáveis de ambiente no seu arquivo `.env` ou no painel do Coolify:

```env
# Gatebox Gateway - Credenciais
GATEBOX_USERNAME=93892492000158  # CNPJ ou username fornecido pela Gatebox
GATEBOX_PASSWORD=@Homolog1        # Senha fornecida pela Gatebox
GATEBOX_BASE_URL=https://api.gatebox.com.br  # URL da API (padrão)

# URL base da aplicação (para webhook)
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
```

## Como Obter as Credenciais

1. Entre em contato com a Gatebox para obter suas credenciais de acesso
2. Você receberá:
   - **Username**: Geralmente o CNPJ da sua empresa (ex: `93892492000158`)
   - **Password**: Senha fornecida pela Gatebox
3. **IMPORTANTE**: Armazene essas credenciais em local seguro

## Endpoints

### Criar Pagamento PIX
- **Endpoint**: `POST /api/deposito/pix-gatebox`
- **Autenticação**: Requer sessão de usuário
- **Body**:
  ```json
  {
    "valor": 100.00,
    "document": "12345678901"  // CPF (opcional se já cadastrado)
  }
  ```
- **Resposta**:
  ```json
  {
    "qrCode": "data:image/png;base64,...",
    "qrCodeText": "00020126...",
    "transactionId": "id-da-transacao",
    "valor": 100.00,
    "status": "pending",
    "expiresAt": "2025-01-23T..."
  }
  ```

### Webhook Gatebox
- **Endpoint**: `POST /api/webhooks/gatebox`
- **Autenticação**: Validação via payload
- **Payload esperado** (formato flexível):
  ```json
  {
    "transactionId": "id-da-transacao",
    "externalId": "deposito_123_1234567890",
    "status": "paid",
    "amount": 100.00,
    "endToEnd": "E60701190202506170515DY5W414HZ69"
  }
  ```

## Status de Transação

O webhook aceita diferentes formatos de status:
- **"paid"**, **"completed"**, **"PAID"**, **"paid_out"**: Transação paga - O depósito será creditado automaticamente
- Outros status: Transação não paga - Será ignorada

## Fluxo de Depósito

1. Usuário solicita depósito via `/api/deposito/pix-gatebox`
2. Sistema cria transação pendente no banco
3. Sistema autentica na Gatebox e gera QR Code PIX
4. Usuário paga o PIX
5. Gatebox envia webhook para `/api/webhooks/gatebox`
6. Sistema processa depósito
7. Saldo do usuário é creditado
8. Bônus é aplicado conforme promoções ativas

## Funcionalidades Disponíveis

### Cash-In (Depósito)
- Criação de QR Code PIX imediato
- Suporte a dados completos do pagador (CPF, nome, email, telefone)
- Suporte a criação sem dados do pagador (pagador diferente)

### Cash-Out (Saque)
- Realização de saques PIX
- Validação de chave PIX (se configurada)

### Consulta de Status
- Consulta por `transactionId`
- Consulta por `externalId`
- Consulta por `endToEnd`

### Consulta de Saldo
- Consulta saldo disponível da conta
- Consulta saldo pendente

### Validação de Chave PIX
- Validação de chaves PIX antes de realizar saques
- Retorna tipo de chave e dados do titular

## Autenticação

A Gatebox usa autenticação Bearer Token:
1. Sistema faz login via `/v1/customers/auth/sign-in` com username/password
2. Recebe `access_token` válido por um período (geralmente 1 hora)
3. Token é cacheado para evitar múltiplas autenticações
4. Token é renovado automaticamente quando expira

## Tratamento de Erros

### Erro 401 - Não autenticado
- Verifique se `GATEBOX_USERNAME` e `GATEBOX_PASSWORD` estão configurados corretamente
- Verifique se as credenciais não expiraram
- O sistema limpa o cache de token automaticamente em caso de erro de autenticação

### Erro 400 - Validação
- Verifique se todos os campos obrigatórios estão preenchidos
- Verifique se o CPF tem 11 dígitos
- Verifique se o telefone tem pelo menos 10 dígitos

### Erro 500 - Erro interno
- Verifique os logs do servidor
- Entre em contato com o suporte da Gatebox se o problema persistir

## Diferenças em relação ao SuitPay

1. **Autenticação**: Gatebox usa username/password + Bearer Token, enquanto SuitPay usa Client ID/Secret nos headers
2. **Estrutura de Payload**: Gatebox tem estrutura mais simples, sem necessidade de endereço completo
3. **Webhook**: Gatebox pode enviar webhooks em diferentes formatos, o handler é flexível para aceitar múltiplos formatos
4. **External ID**: Gatebox usa `externalId` como identificador principal para conciliação

## Exemplo de Uso

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
    document: '12345678901'
  })
})

const data = await response.json()
// data.qrCode - QR Code em base64
// data.qrCodeText - Texto do QR Code para copiar
```

## Notas Importantes

1. O sistema usa `externalId` como referência principal para conciliação de transações
2. O webhook é flexível e aceita diferentes formatos de payload da Gatebox
3. O cache de token é gerenciado automaticamente para otimizar performance
4. Telefones são formatados automaticamente para o padrão internacional (+55XXXXXXXXXXX)
