# Integração SuitPay Gateway

Este documento descreve a integração com o gateway de pagamento SuitPay para processar depósitos PIX.

## Variáveis de Ambiente Necessárias

Adicione as seguintes variáveis de ambiente no seu arquivo `.env` ou no painel do Coolify:

```env
# SuitPay Gateway - Credenciais
SUITPAY_CLIENT_ID=seu_client_id_aqui
SUITPAY_CLIENT_SECRET=seu_client_secret_aqui
SUITPAY_BASE_URL=https://sandbox.ws.suitpay.app  # Sandbox
# SUITPAY_BASE_URL=https://ws.suitpay.app  # Produção
SUITPAY_USERNAME_CHECKOUT=seu_username_checkout

# URL base da aplicação (para webhook)
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
```

## Como Obter as Credenciais

1. Acesse o portal da SuitPay com seu usuário e senha
2. Navegue até: **VENDAS -> GATEWAY DE PAGAMENTO -> Chaves API**
3. Clique em "Gerar Chaves"
4. Copie o **Client ID (ci)** e **Client Secret (cs)**
5. **IMPORTANTE**: Armazene essas chaves em local seguro, pois não será possível visualizá-las novamente

## Endpoints

### Criar Pagamento PIX
- **Endpoint**: `POST /api/deposito/pix`
- **Autenticação**: Requer sessão de usuário
- **Body**:
  ```json
  {
    "valor": 100.00,
    "document": "12345678901",  // CPF (opcional se já cadastrado)
    "cep": "74000000",  // Opcional
    "endereco": {  // Opcional
      "street": "Rua Exemplo",
      "number": "123",
      "complement": "Apto 101",
      "neighborhood": "Centro",
      "city": "Goiânia",
      "state": "GO"
    }
  }
  ```
- **Resposta**:
  ```json
  {
    "qrCode": "data:image/png;base64,...",
    "qrCodeText": "00020126...",
    "transactionId": "uuid-da-transacao",
    "valor": 100.00,
    "status": "pending",
    "expiresAt": "2025-01-23T..."
  }
  ```

### Webhook SuitPay
- **Endpoint**: `POST /api/webhooks/suitpay`
- **Autenticação**: Validação via hash SHA-256
- **Payload esperado**:
  ```json
  {
    "idTransaction": "uuid",
    "typeTransaction": "PIX",
    "statusTransaction": "PAID_OUT",
    "value": 100.00,
    "payerName": "Nome do Pagador",
    "payerTaxId": "12345678901",
    "paymentDate": "23/01/2025 14:30:00",
    "paymentCode": "codigo-pix",
    "requestNumber": "deposito_123_1234567890",
    "hash": "hash-sha256"
  }
  ```

## Status de Transação

- **PAID_OUT**: Transação paga - O depósito será creditado automaticamente
- **CHARGEBACK**: Estorno - A transação será revertida

## Validação de Hash do Webhook

O webhook valida a integridade dos dados usando hash SHA-256:

1. Concatena todos os valores dos campos (exceto hash) em ordem
2. Concatena o Client Secret com o resultado
3. Calcula SHA-256 da string resultante
4. Compara com o hash recebido

## Fluxo de Depósito

1. Usuário solicita depósito via `/api/deposito/pix`
2. Sistema cria transação pendente no banco
3. Sistema gera QR Code PIX via SuitPay
4. Usuário paga o PIX
5. SuitPay envia webhook para `/api/webhooks/suitpay`
6. Sistema valida hash e processa depósito
7. Saldo do usuário é creditado
8. Bônus é aplicado conforme promoções ativas

## Código IBGE

O sistema busca automaticamente o código IBGE do município usando o CEP fornecido. Se o CEP não for fornecido ou não for encontrado, será usado um código padrão (Goiânia - 5208707).

## Remoção do Receba Online

O código do Receba Online foi completamente removido e substituído pela integração SuitPay. Os seguintes arquivos foram removidos:

- `lib/receba-client.ts`
- `app/api/webhooks/receba/route.ts`

## Troubleshooting

### Erro 401 - Não autenticado
- Verifique se `SUITPAY_CLIENT_ID` e `SUITPAY_CLIENT_SECRET` estão configurados corretamente
- Verifique se as chaves não expiraram (gere novas chaves se necessário)

### Erro 400 - Validação
- Verifique se todos os campos obrigatórios estão preenchidos
- Verifique se o CPF tem 11 dígitos
- Verifique se o telefone tem pelo menos 10 dígitos

### Webhook não está sendo recebido
- Verifique se `NEXT_PUBLIC_APP_URL` está configurado corretamente
- Verifique se o endpoint `/api/webhooks/suitpay` está acessível publicamente
- Verifique os logs do sistema para ver se há erros de validação de hash

### QR Code não aparece
- Verifique os logs para ver a resposta completa da API SuitPay
- Verifique se `qrCode` ou `qrCodeImage` estão presentes na resposta

## Documentação Oficial

Para mais informações, consulte a documentação oficial da SuitPay:
- Sandbox: https://sandbox.ws.suitpay.app
- Produção: https://ws.suitpay.app
