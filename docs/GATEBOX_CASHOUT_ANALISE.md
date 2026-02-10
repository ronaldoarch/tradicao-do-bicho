# Análise Gatebox Cash-Out (Withdraw)

Comparação entre a documentação Postman da Gatebox e nossa implementação.

## Endpoint

- **URL:** `POST {{API_URL}}/v1/customers/pix/withdraw`
- **Auth:** Bearer token (obtido via sign-in)
- **Headers:** Content-Type: application/json, Authorization: Bearer {token}

## Payload (Postman – NÃO inclui IP)

O Postman **não envia** nenhum campo de IP. A Gatebox obtém o IP da conexão TCP, não do body.

```json
{
  "externalId": "<id de conciliacao>",
  "key": "<chave pix do recebedor>",
  "name": "<nome completo do recebedor>",
  "description": "<descricao da transacao>",
  "amount": 0.1,
  "documentNumber": "<cpf/cnpj do recebedor>"
}
```

| Campo | Obrigatório | Formato |
|-------|-------------|---------|
| externalId | Sim | string - ID único conciliação |
| key | Sim | Chave PIX (CPF, email, telefone, aleatória) |
| name | Sim | Nome completo do recebedor |
| description | Não | Descrição da transação |
| amount | Sim | Valor em reais (ex: 0.1 = R$ 0,10) |
| documentNumber | Só se validação ativa | CPF/CNPJ **sem pontuação** (11 ou 14 dígitos) |

## Formato da chave PIX (key)

- **Telefone:** E.164, ex: `+5514987654321` ou `+5549992961626`
- **CPF:** 11 dígitos, sem pontuação
- **Email:** formato normal
- **Aleatória:** UUID ou chave aleatória

Endpoint "Validar chave Pix" (`GET /v1/customers/pix/pix-search?dict=...`) exige **sem pontuação**.

## Nossa implementação

- `externalId`: `saque-${saque.id}` ✅
- `key`: `chavePixNormalizada` (telefone → +55) ✅
- `name`: `usuario.nome` ✅
- `description`: `Saque #${saque.id}` ✅
- `amount`: `valor` (em reais) ✅
- `documentNumber`: sanitizado (apenas dígitos) ✅

## Log para debug

Em caso de erro, o servidor registra: `[Gatebox withdraw] POST {url} body: {json}` — compare com o que o Postman envia.
