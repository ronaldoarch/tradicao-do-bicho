# Diagnóstico: Webhook Gatebox não creditando depósitos

Se os webhooks estão configurados na Gatebox mas os depósitos não caem na carteira, siga estes passos:

## 1. Verificar se o webhook está chegando

**Admin → Tracking → Webhooks** (ou `/admin/tracking`)

- Filtre por **Source:** `gatebox`
- Verifique se há eventos na data/hora do depósito

**Se NÃO houver eventos:** O webhook não está alcançando seu servidor.

Possíveis causas:
- **Firewall** bloqueando requisições POST de IPs da Gatebox
- **Proxy/load balancer** (Cloudflare, etc.) bloqueando ou alterando a requisição
- **URL incorreta** (verifique se é exatamente `https://tradicaodobicho.site/api/webhooks/gatebox`)
- **SSL** – certificado inválido ou expirado

**Se HOUVER eventos:** Verifique o **Status** (received, processed, failed) e o campo **Error**.

## 2. Logs do servidor

Após o deploy com os novos logs, ao receber um webhook você verá:

```
📥 Webhook Gatebox recebido: { tipo: 'PIX_PAY_IN', externalId: 'deposito_2_...', status: 'COMPLETED' }
```

Se a transação não for encontrada:

```
⚠️ Webhook Gatebox: transação não encontrada { refs: [...], payloadKeys: [...] }
```

## 3. Formato do payload

A Gatebox envia o payload aninhado. Verificamos:
- `body.externalId` ou `body.invoice.externalId` ou `body.transaction.externalId`

Se o formato mudou, a transação pode não ser encontrada. Verifique o payload no registro do WebhookEvent.

## 4. Fallback – cron

Enquanto diagnostica, use o cron para processar depósitos pendentes:

```bash
curl "https://tradicaodobicho.site/api/cron/verificar-depositos-pendentes?secret=SEU_CRON_SECRET"
```

Configure para rodar a cada 2 minutos.
