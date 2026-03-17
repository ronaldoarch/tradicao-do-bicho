# Possíveis Bloqueios da Liquidação

Este documento lista os motivos que podem impedir a liquidação de apostas pendentes.

## 1. Data futura

**Condição:** A data do concurso ainda não passou.

**Onde:** `podeTentarLiquidar()` retorna `false` quando `dataConcurso > hoje`.

**Solução:** Aguardar a data do concurso.

---

## 2. Sem sorteio no dia da semana

**Condição:** A extração não tem sorteio no dia da semana da aposta (ex.: FEDERAL só sábado, PT RIO 18:30 não tem sábado).

**Onde:** `temSorteioNoDia()` em `horarios-reais-apuracao.ts`.

**Solução:** Verificar se a aposta foi feita em dia válido para aquela extração.

---

## 3. API Agência Midas sem resultados

**Condição:** A API externa não retorna resultados para a loteria/data.

**Possíveis causas:**
- API fora do ar ou lenta
- Loteria não mapeada em `CODIGO_LOTERIA_MAP`
- Data sem resultados publicados ainda
- Timeout (30s)

**Solução:** Verificar logs, testar `GET /api/resultados/liquidar/debug` para ver resultados disponíveis.

---

## 4. Aposta sem `betData`

**Condição:** O campo `detalhes.betData` está ausente ou vazio.

**Onde:** Linha ~407 em `liquidar/route.ts` — retorna cedo sem processar.

**Solução:** Apostas antigas ou de fluxos alternativos podem não ter betData. Verificar origem da aposta.

---

## 5. Formato de horário incompatível (corrigido)

**Condição:** Horário da aposta em formato diferente do resultado (ex.: "9:30" vs "09:30", "11h20" vs "11:20").

**Correção aplicada:** Uso de `normalizarChaveHorario()` para padronizar horários em HH:MM em toda a liquidação.

---

## 6. Loteria não encontrada

**Condição:** Loteria da aposta (ID ou nome) não corresponde a nenhuma extração em `extracoes.ts`.

**Onde:** `normalizarLoteria()` retorna o ID original se não encontrar; `nomeParaCodigo()` retorna `null` para loteria desconhecida.

**Solução:** Verificar se a loteria existe em `data/extracoes.ts` e se o mapeamento em `agenciamidas-api.ts` está correto.

---

## 7. Resultado incompleto

**Condição:** A API retorna menos de 7 prêmios (1º a 7º) para a extração.

**Onde:** O motor de regras espera até 7 posições.

**Solução:** LOTEP e LOTECE calculam 6º e 7º automaticamente. Outras loterias dependem da API.

---

## Como diagnosticar

1. **Estatísticas:** `GET /api/resultados/liquidar` — quantas pendentes/liquidadas
2. **Debug:** `GET /api/resultados/liquidar/debug?loteria=PT RIO&data=2026-03-17` — resultados disponíveis e motivos
3. **Logs:** Verificar console ao executar `POST /api/resultados/liquidar` — mensagens como "Nenhum resultado encontrado para aposta X", "Pulando aposta X - data futura"
