# Liquidação automática de apostas

A liquidação usa a API Agência Midas e marca apostas como **liquidado** ou **perdida**, creditando prêmios no saldo.

## Endpoint

- **POST** `/api/resultados/liquidar` — processa todas as apostas pendentes (ou filtra por `loteria`, `dataConcurso`, `horario` no body).
- **GET** `/api/resultados/liquidar` — retorna apenas estatísticas (pendentes, liquidadas, perdidas).

## Comando usado (local e produção)

O mesmo comando que o cron usa — em **local** com `localhost:3001`, em **produção** troque pela URL do app:

```bash
# Local
curl -X POST http://localhost:3001/api/resultados/liquidar \
  -H "Content-Type: application/json" \
  -d '{"usarMonitor": false}' \
  --max-time 120

# Produção (troque pela URL do seu app)
curl -X POST https://tradicaodobicho.site/api/resultados/liquidar \
  -H "Content-Type: application/json" \
  -d '{"usarMonitor": false}' \
  --max-time 120
```

O body `{"usarMonitor": false}` é opcional; o endpoint aceita também `{}`. Resposta esperada: `processadas`, `liquidadas`, `premioTotal`.

## Cron em produção (Coolify / job)

O script `scripts/cron/liquidar.sh` **exige** a variável **`API_URL`** com a URL do app.

- **Coolify / job agendado:** na configuração do job, defina a variável de ambiente:
  - Nome: `API_URL`
  - Valor: `https://tradicaodobicho.site` (use a URL real do seu app, **sem barra no final**, **sem espaços nem quebras de linha**)
- **Não use** `...` nem deixe vazio — isso gera `Could not resolve host` e `No host part in the URL`.
- Se aparecer **Malformed input to a URL function**: a URL tem caractere inválido (espaço, Enter, etc.). O script já remove espaços/quebras nas bordas; confira no Coolify se o valor está exatamente `https://tradicaodobicho.site` (uma linha só).

Se `API_URL` estiver vazia ou inválida, o script falha logo no início com mensagem clara.

**Cron manual (servidor):**
```bash
export API_URL=https://tradicaodobicho.site
# ou na linha do cron:
# */10 * * * * API_URL=https://tradicaodobicho.site /caminho/scripts/cron/liquidar.sh
```

Sugestão: rodar a cada 10–15 minutos.
