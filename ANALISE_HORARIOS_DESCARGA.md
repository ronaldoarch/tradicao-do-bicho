# 📊 Análise de Horários para Relatório de Descarga

## Comparação: Imagem vs Sistema Configurado

### ⚠️ Loterias Faltando no Sistema

A imagem mostra loterias que **NÃO estão configuradas** no sistema:

| Loteria (Imagem) | Horário (Imagem) | Status |
|-----------------|------------------|--------|
| POP09 LT POPULAR 09HS | 09:00 | ❌ **FALTANDO** |
| CP10 LT CAPITAL 10HS | 10:00 | ❌ **FALTANDO** |
| CP14 LT CAPITAL 14HS | 14:00 | ❌ **FALTANDO** |
| CP22 LT CAPITAL 22HS | 22:00 | ❌ **FALTANDO** |
| MQ09 (Maluca?) | 09:15 | ❌ **FALTANDO** |

### ⚠️ Diferenças de Horários

| Loteria | Horário (Imagem) | Horário (Sistema) | Diferença | Status |
|---------|------------------|-------------------|-----------|--------|
| NAC02 LT NACIONAL 02HS | 01:55 | 02:00 | -5 min | ⚠️ **DIFERENTE** |
| GO07 LT LOOK 07HS | 07:15 | 07:20 | -5 min | ⚠️ **DIFERENTE** |
| NAC12 LT NACIONAL 12HS | 11:55 | 12:00 | -5 min | ⚠️ **DIFERENTE** |
| NAC17 LT NACIONAL 17HS | 16:55 | 17:00 | -5 min | ⚠️ **DIFERENTE** |
| NAC19 LT NACIONAL 19HS | 18:55 | ❌ Não existe | - | ⚠️ **FALTANDO** |
| NAC20 LT NACIONAL 21HS | 20:55 | 21:00 | -5 min | ⚠️ **DIFERENTE** |
| GO23 LT LOOK 23HS | 23:15 | 23:20 | -5 min | ⚠️ **DIFERENTE** |

### ✅ Horários Corretos

| Loteria | Horário (Imagem) | Horário (Sistema) | Status |
|---------|------------------|-------------------|--------|
| GO09 LT LOOK 09HS | 09:15 | 09:20 | ⚠️ **DIFERENTE** (-5 min) |
| PT09 (PT RIO 09HS) | 09:15 | 09:20 | ⚠️ **DIFERENTE** (-5 min) |
| PT11 (PT RIO 11HS) | 11:15 | 11:20 | ⚠️ **DIFERENTE** (-5 min) |
| PT14 (PT RIO 14HS) | 14:15 | 14:20 | ⚠️ **DIFERENTE** (-5 min) |
| PT16 (PT RIO 16HS) | 16:15 | 16:20 | ⚠️ **DIFERENTE** (-5 min) |
| PT18 (PT RIO 18HS) | 18:15 | 18:20 | ⚠️ **DIFERENTE** (-5 min) |
| PT21 (PT RIO 21HS) | 21:15 | 21:20 | ⚠️ **DIFERENTE** (-5 min) |

## 🔍 Observações Importantes

1. **Padrão de Diferença**: A maioria dos horários na imagem está **5 minutos antes** dos horários configurados no sistema
2. **Loterias Novas**: Há loterias na imagem que não existem no sistema (POPULAR, CAPITAL, MQ)
3. **Horário de Envio**: O sistema envia relatórios `minutosAntesFechamento` minutos antes do fechamento (padrão: 10 minutos)
   - Se o fechamento é às 11:20, envia às 11:10
   - Mas na imagem mostra 11:15, que seria 5 minutos antes

## 💡 Recomendações

### Opção 1: Ajustar Horários no Sistema
Atualizar `data/horarios-reais-apuracao.ts` e `data/extracoes.ts` para corresponder aos horários da imagem.

### Opção 2: Adicionar Novas Loterias
Adicionar as loterias faltantes:
- POPULAR (POP)
- CAPITAL (CP)
- MQ (Maluca?)

### Opção 3: Ajustar `minutosAntesFechamento`
Se os horários da imagem são os horários de **envio** (não fechamento), então:
- Horário de fechamento real = Horário da imagem + 5 minutos
- Ou ajustar `minutosAntesFechamento` para 5 minutos

## 📋 Próximos Passos

1. Confirmar se os horários da imagem são:
   - Horários de **fechamento/apuração**?
   - Horários de **envio do relatório**?
   
2. Se forem horários de fechamento:
   - Atualizar `horarios-reais-apuracao.ts` com os horários corretos
   - Adicionar loterias faltantes
   
3. Se forem horários de envio:
   - Manter horários de fechamento como estão
   - Ajustar `minutosAntesFechamento` para 5 minutos (ou calcular dinamicamente)
