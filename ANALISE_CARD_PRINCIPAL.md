# Análise do Código do Card Principal

## Estrutura do Card

### Elemento Principal
```tsx
<button
  key={modality.id}
  onClick={() => onModalitySelect(modality.id.toString())}
  className={`flex min-h-[72px] flex-row items-center justify-between rounded-lg border-2 py-3 px-4 text-left transition-all ${
    isSelected
      ? 'border-blue bg-blue/5'
      : 'border-gray-200 bg-white hover:border-blue/30'
  }`}
>
```

## Classes CSS Aplicadas

### Layout e Posicionamento
- `flex` - Define display flex
- `flex-row` - Layout horizontal (linha)
- `items-center` - Alinha itens verticalmente ao centro
- `justify-between` - Espaça nome à esquerda e badge à direita

### Dimensões
- `min-h-[72px]` - Altura mínima de 72px para consistência

### Bordas e Arredondamento
- `rounded-lg` - Border-radius de 8px (bordas arredondadas)
- `border-2` - Borda de 2px

### Padding
- `py-3` - Padding vertical de 12px (3 * 4px)
- `px-4` - Padding horizontal de 16px (4 * 4px)

### Estados
- **Normal (não selecionado):**
  - `border-gray-200` - Borda cinza clara
  - `bg-white` - Fundo branco
  - `hover:border-blue/30` - Borda azul ao passar o mouse

- **Selecionado:**
  - `border-blue` - Borda azul escuro
  - `bg-blue/5` - Fundo azul com 5% de opacidade

### Transições
- `transition-all` - Anima todas as propriedades CSS

### Alinhamento de Texto
- `text-left` - Alinha texto à esquerda

## Conteúdo Interno

### 1. Nome da Modalidade (Lado Esquerdo)
```tsx
<h3 className="text-base font-bold text-blue leading-tight">
  {modality.name}
</h3>
```
- `text-base` - Tamanho de fonte 16px
- `font-bold` - Negrito
- `text-blue` - Cor azul escuro (#052370)
- `leading-tight` - Line-height reduzido

### 2. Badge com Valor (Lado Direito)
```tsx
<div className="flex items-center gap-1">
  <div className="inline-flex items-center gap-1 rounded-full border-2 border-blue bg-blue px-3 py-1.5">
    <span className="text-sm font-bold text-white leading-tight">
      {modality.value}
    </span>
    {modality.hasLink && (
      <span className="text-red-500 text-sm leading-none">🔥</span>
    )}
  </div>
</div>
```

#### Badge Container
- `inline-flex` - Display inline-flex
- `items-center` - Alinha itens ao centro
- `gap-1` - Espaçamento de 4px entre itens
- `rounded-full` - Border-radius 100% (formato pílula)
- `border-2` - Borda de 2px
- `border-blue` - Cor da borda azul escuro
- `bg-blue` - Fundo azul escuro
- `px-3` - Padding horizontal de 12px
- `py-1.5` - Padding vertical de 6px

#### Valor
- `text-sm` - Tamanho de fonte 14px
- `font-bold` - Negrito
- `text-white` - Cor branca
- `leading-tight` - Line-height reduzido

#### Ícone de Fogo (condicional)
- `text-red-500` - Cor vermelha
- `text-sm` - Tamanho de fonte 14px
- `leading-none` - Sem line-height (remove espaçamento)

## Resumo das Propriedades

| Propriedade | Valor | Descrição |
|------------|-------|-----------|
| Display | flex | Layout flexível |
| Direction | row | Horizontal |
| Min Height | 72px | Altura mínima |
| Border Radius | 8px (rounded-lg) | Bordas arredondadas |
| Border Width | 2px | Espessura da borda |
| Padding Vertical | 12px | Espaçamento interno vertical |
| Padding Horizontal | 16px | Espaçamento interno horizontal |
| Border Color (normal) | gray-200 | Borda cinza clara |
| Background (normal) | white | Fundo branco |
| Border Color (selected) | blue | Borda azul escuro |
| Background (selected) | blue/5 | Fundo azul transparente |
