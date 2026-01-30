# Liquidação automática de apostas

A liquidação usa a API Agência Midas e marca apostas como **liquidado** ou **perdida**, creditando prêmios no saldo.

## Endpoint

- **POST** `/api/resultados/liquidar` — processa todas as apostas pendentes (ou filtra por `loteria`, `dataConcurso`, `horario` no body).
- **GET** `/api/resultados/liquidar` — retorna apenas estatísticas (pendentes, liquidadas, perdidas).

## Cron em produção

O script `scripts/cron/liquidar.sh` chama o endpoint. **Em produção é obrigatório definir a URL do app:**

```bash
export API_URL=https://tradicaodobicho.site
# ou no cron:
# */10 * * * * API_URL=https://tradicaodobicho.site /caminho/scripts/cron/liquidar.sh
```

Se `API_URL` não for definida, o script usa `http://localhost:3001` e a liquidação não rodará no servidor real.

Sugestão: rodar a cada 10–15 minutos para liquidar assim que os resultados estiverem disponíveis.

## Teste manual

```bash
curl -X POST "https://tradicaodobicho.site/api/resultados/liquidar" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Resposta esperada: `processadas`, `liquidadas`, `premioTotal`.
