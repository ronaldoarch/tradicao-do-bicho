# Exemplo de Cálculo de Retorno Previsto

## Cenário do Usuário:
- **5 palpites** (5 grupos diferentes)
- **5 posições** (1º ao 5º prêmio)
- **R$ 10,00** em cada palpite
- **Total:** R$ 50,00 (5 × R$ 10)

## Cálculo por Palpite (GRUPO Simples):

### Para cada palpite de grupo:

1. **Combinações:** 1 (grupo simples)
2. **Posições:** 5 (1º ao 5º)
3. **Unidades:** 1 × 5 = **5 unidades**
4. **Valor unitário:** R$ 10,00 ÷ 5 = **R$ 2,00 por unidade**
5. **Odd GRUPO 1-5:** **18x** (conforme tabela)
6. **Prêmio por unidade:** 18 × R$ 2,00 = **R$ 36,00**

### Retorno por Palpite:

- **Se acertar em 1 posição:** 1 × R$ 36,00 = **R$ 36,00**
- **Se acertar em 2 posições:** 2 × R$ 36,00 = **R$ 72,00**
- **Se acertar em 3 posições:** 3 × R$ 36,00 = **R$ 108,00**
- **Se acertar em 4 posições:** 4 × R$ 36,00 = **R$ 144,00**
- **Se acertar em 5 posições:** 5 × R$ 36,00 = **R$ 180,00** (máximo)

## Retorno Total (5 Palpites):

### Cenário 1: Cada grupo acerta em 1 posição
- Palpite 1: R$ 36,00
- Palpite 2: R$ 36,00
- Palpite 3: R$ 36,00
- Palpite 4: R$ 36,00
- Palpite 5: R$ 36,00
- **Total:** R$ 180,00

### Cenário 2: Cada grupo acerta em todas as 5 posições (máximo)
- Cada palpite: R$ 180,00
- **Total:** R$ 900,00

### Cenário 3: Média (cada grupo acerta em 2-3 posições)
- Cada palpite: R$ 72,00 - R$ 108,00
- **Total:** R$ 360,00 - R$ 540,00

## Fórmula Geral:

```
Para cada palpite de GRUPO:
- Unidades = 1 × (pos_to - pos_from + 1)
- Valor unitário = Valor do palpite ÷ Unidades
- Prêmio por unidade = Odd × Valor unitário
- Retorno = Acertos × Prêmio por unidade
```

## Observação:

O **retorno previsto** mostrado no sistema geralmente é calculado assumindo que cada grupo acerta em **pelo menos 1 posição**. O retorno real depende de quantas posições cada grupo realmente acerta no resultado oficial.
