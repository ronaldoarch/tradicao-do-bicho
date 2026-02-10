# Análise Gatebox Cash-Out (Withdraw)

Comparação entre a documentação Postman da Gatebox e nossa implementação.

## Endpoint

- **URL:** `POST {{API_URL}}/v1/customers/pix/withdraw`
- **Auth:** Bearer token (obtido via sign-in)

## Payload esperado (Postman)

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
- `documentNumber`: `usuario.cpf ?? undefined` ⚠️ Deve ser sanitizado (apenas dígitos)

## Correções aplicadas

1. **documentNumber:** Enviar apenas dígitos (CPF/CNPJ sem pontuação)
2. **key:** Já normalizada para E.164 em telefones via `normalizePixKey()`
