# Configurar Webhooks

Guia para configurar os webhooks de depósito PIX (Gatebox e SuitPay) na aplicação.

---

## 1. URLs dos webhooks da aplicação

Os gateways (Gatebox e SuitPay) precisam chamar estas URLs quando um PIX for pago:

| Gateway   | URL do webhook (callback) |
|-----------|---------------------------|
| **Gatebox** | `https://SEU-DOMINIO.com/api/webhooks/gatebox` |
| **SuitPay** | `https://SEU-DOMINIO.com/api/webhooks/suitpay` |

Substitua `SEU-DOMINIO.com` pela URL real da sua aplicação (ex.: `agenciamidas.com` ou a URL do Coolify).

A variável de ambiente **`NEXT_PUBLIC_APP_URL`** deve estar definida com essa mesma URL (ex.: `https://agenciamidas.com`), pois o sistema usa ela ao gerar o QR Code e informar o callback ao gateway.

---

## 2. Configurar no painel admin da aplicação

No **Admin → Gateways** (`/admin/gateways`) você cadastra cada gateway. O formulário equivale ao modal que você viu:

| Campo no modal | No formulário Admin | O que preencher |
|----------------|---------------------|------------------|
| **URL**        | **URL base**        | URL da API do gateway (ex.: Gatebox `https://api.gatebox.com.br`, SuitPay `https://ws.suitpay.app` ou sandbox `https://sandbox.ws.suitpay.app`) |
| **Usuário**    | **Usuário**         | **Gatebox:** CNPJ/username fornecido pela Gatebox. **SuitPay:** pode ficar em branco (usa Client ID/Secret). |
| **Senha**      | **Senha**           | **Gatebox:** senha fornecida pela Gatebox. **SuitPay:** pode ficar em branco (usa apiKey). |
| **Tipo**       | **Tipo**            | `gatebox` ou `suitpay` |
| **Toggle**     | **Ativo**           | Marque como ativo para usar esse gateway nos depósitos. |

Para **SuitPay**, use também o campo **Chave API (apiKey)** no admin: informe no formato `CLIENT_ID|CLIENT_SECRET` (ex.: `abc123|xyz789`).

Resumo rápido:
- **Gatebox:** preencha Nome, Tipo = `gatebox`, URL base da API Gatebox, Usuário (CNPJ), Senha. Deixe ativo.
- **SuitPay:** preencha Nome, Tipo = `suitpay`, URL base da API SuitPay, Chave API = `Client ID|Client Secret`. Usuário/Senha podem ficar em branco. Deixe ativo.

---

## 3. Configurar no painel do gateway (Gatebox / SuitPay)

Depois de cadastrar o gateway no admin, o **próximo passo** é informar no painel do próprio gateway qual URL ele deve chamar quando um PIX for pago.

### Gatebox – Webhook para receber o retorno (callback)

No painel da Gatebox, ao configurar o webhook:

1. **URL:** `https://SEU-DOMINIO.com/api/webhooks/gatebox`
2. **Tipo de evento:** selecione **`PIX_PAY_IN`** (entrada de PIX = pagamento recebido).  
   Esse é o evento que a aplicação usa para creditar o depósito. Os outros tipos (PIX_PAY_OUT, PIX_REVERSAL, PIX_REFUND, BILLPAYMENT, etc.) podem ser ignorados ou configurados depois se precisar de estorno/chargeback.
3. Deixe o webhook **ativo** (toggle ligado) e clique em **Adicionar**.

A aplicação aceita tanto o evento **PIX_PAY_IN** quanto os status `paid`, `completed`, `pago`, `paid_out` no payload. Não é necessário usuário/senha no webhook; a validação é feita pelo payload.

**Tipos de evento Gatebox (referência):**
- **PIX_PAY_IN** → use este para depósitos PIX recebidos (retorno que credita o saldo).
- PIX_PAY_OUT, PIX_REVERSAL, PIX_REVERSAL_OUT, PIX_REFUND, BILLPAYMENT, CREDIT_CARD_OUT, CREDIT_CARD_CHARGEBACK, INFRACTION → não são usados para creditar depósito; configure só PIX_PAY_IN.

### SuitPay

1. Acesse o portal SuitPay → **VENDAS → GATEWAY DE PAGAMENTO** (ou área de integração).
2. Configure a **URL de callback/webhook**: `https://SEU-DOMINIO.com/api/webhooks/suitpay`.
3. A SuitPay envia um hash no payload; o sistema valida com a variável **`SUITPAY_CLIENT_SECRET`**. Garanta que essa variável esteja definida no ambiente (Coolify/.env) com o mesmo Client Secret do gateway.

---

## 4. Variáveis de ambiente necessárias

No **Coolify** (ou `.env`), confira:

```env
# URL pública da aplicação (usada para montar a URL do webhook)
NEXT_PUBLIC_APP_URL=https://SEU-DOMINIO.com

# Apenas para SuitPay – usado para validar o hash do webhook
SUITPAY_CLIENT_SECRET=seu_client_secret_suitpay
```

Para **Gatebox**, usuário e senha vêm do cadastro no Admin → Gateways (não é obrigatório colocar em variável de ambiente).

---

## 5. Resumo do fluxo

1. **Admin → Gateways:** cadastrar Gatebox e/ou SuitPay (URL base, Usuário, Senha, Tipo, Ativo).
2. **Painel do gateway:** configurar a URL de callback apontando para `https://SEU-DOMINIO.com/api/webhooks/gatebox` ou `.../api/webhooks/suitpay`.
3. **Ambiente:** definir `NEXT_PUBLIC_APP_URL` e, para SuitPay, `SUITPAY_CLIENT_SECRET`.
4. Ao usuário pagar um PIX, o gateway chama o webhook → a aplicação credita o saldo e aplica bônus conforme as promoções.

---

## 6. Conferir se os webhooks estão chegando

- **Admin → Tracking** (`/admin/tracking`): aba **Webhooks** lista os eventos recebidos (source, status, payload). Use para ver se os callbacks do Gatebox/SuitPay estão sendo recebidos e processados.

Se aparecerem eventos com status de erro, verifique o payload e os logs da aplicação para ajustar o processamento ou a configuração do gateway.
