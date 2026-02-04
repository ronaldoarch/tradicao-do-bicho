# Análise Detalhada: Erro de Descarga FRK (Código 013)

## Problema Identificado

A API FRK está retornando erro `013` com a mensagem:
```
"Equipamento com data/hora inválida. Favor ajustar para 04/02/2026 17:15"
```

**Comportamento observado:**
- Enviamos o horário exato sugerido pela API (`04/02/2026 17:15`)
- A API continua retornando o mesmo erro pedindo o mesmo horário
- Isso indica que há validação além do formato da data/hora

## Possíveis Causas

### 1. **Validação de Sincronização do Terminal**
A API pode estar validando se o horário do terminal (`sdtDataHoraTerminal`) está sincronizado com o servidor da API. Mesmo usando o horário sugerido, se o terminal não estiver sincronizado, a validação pode falhar.

**Solução proposta:**
- Usar o horário atual do servidor convertido para Brasília (UTC-3) para `sdtDataHoraTerminal`
- Garantir que o servidor tenha NTP configurado para sincronização de tempo

### 2. **Extração Não Disponível/Ativa**
A extração 130 pode não estar disponível ou ativa no horário especificado. A API pode estar validando se a extração existe e está aberta para apostas.

**Solução proposta:**
- Buscar extrações disponíveis antes de tentar descarga usando `buscarExtracoes()`
- Verificar se a extração 130 existe e está ativa (`tnySituacao`)
- Usar o horário correto da extração (`chrHorario`)

### 3. **Formato de Data/Hora Incorreto**
A API pode estar esperando um formato diferente, como:
- Com segundos: `DD/MM/YYYY HH:mm:ss`
- Com timezone explícito
- Formato diferente para `sdtDataHora` vs `sdtDataHoraTerminal`

**Solução proposta:**
- Testar diferentes formatos de data/hora
- Verificar documentação da API para formato exato esperado

### 4. **Configuração do Terminal**
Os campos `chrSerial`, `chrCodigoPonto`, `chrCodigoOperador` podem estar incorretos ou não sincronizados com o servidor da API.

**Solução proposta:**
- Verificar com suporte FRK se os valores estão corretos
- Confirmar se o terminal está registrado e ativo no sistema FRK

### 5. **Validação de Intervalo de Tempo**
A API pode estar validando se o horário está dentro de um intervalo válido para apostas na extração (ex: não pode ser muito no passado ou muito no futuro).

**Solução proposta:**
- Usar horário atual ou muito próximo do atual
- Verificar se há um intervalo de tempo mínimo/máximo para apostas

## Soluções Implementadas

### 1. Retry com Horário Sugerido
- Detecta quando a API sugere um horário específico
- Tenta novamente com o horário sugerido
- Limita a 1 retry para evitar loop infinito

### 2. Conversão de Formato
- Converte datas de `YYYY-MM-DD` para `DD/MM/YYYY`
- Mantém horário no formato brasileiro `DD/MM/YYYY HH:mm`

### 3. Horário do Terminal
- Usa horário atual do servidor convertido para Brasília (UTC-3) para `sdtDataHoraTerminal`

## Próximos Passos Recomendados

### 1. Buscar Extrações Disponíveis
Antes de tentar descarga, buscar extrações disponíveis para a data:
```typescript
const extracoes = await client.buscarExtracoes('2026-02-04')
const extracao130 = extracoes.find(e => e.tnyExtracao === 130)
if (!extracao130 || extracao130.tnySituacao !== 1) {
  throw new Error('Extração 130 não está disponível')
}
```

### 2. Usar Horário da Extração
Se a extração tiver um horário específico (`chrHorario`), usar esse horário:
```typescript
const horarioExtracao = extracao130.chrHorario // Ex: "17:15"
const dataHora = `${dataJogo} ${horarioExtracao}`
```

### 3. Verificar Documentação da API
- Confirmar formato exato esperado para `sdtDataHora` e `sdtDataHoraTerminal`
- Verificar se há campos adicionais necessários
- Confirmar regras de validação de data/hora

### 4. Contatar Suporte FRK
Se o problema persistir, contatar suporte FRK com:
- Código de erro: `013`
- Mensagem completa: `"Equipamento com data/hora inválida. Favor ajustar para 04/02/2026 17:15"`
- Payload enviado (sem credenciais sensíveis)
- Configuração do terminal (chrSerial, chrCodigoPonto, chrCodigoOperador)

## Logs para Análise

Os logs mostram:
1. ✅ Autenticação bem-sucedida
2. ✅ Formato de data/hora correto (`04/02/2026 17:15`)
3. ✅ Horário sugerido sendo usado corretamente
4. ❌ API ainda retorna erro mesmo com horário sugerido

Isso sugere que o problema não é de formato, mas sim de validação de negócio ou configuração do terminal.
