# Configuração de Storage Persistente para Banners e Logos

## Problema

Por padrão, arquivos salvos em `/app/public/uploads/` dentro do container Docker são **perdidos** quando:
- O container é recriado
- O deploy é feito novamente
- O servidor reinicia

## Solução: Volume Persistente no Coolify

### Passo a Passo

1. **Acesse o Coolify**
   - Vá para o seu projeto no Coolify
   - Clique na aplicação "tradicao-do-bicho"

2. **Configure o Volume Persistente**
   - No menu lateral, clique em **"Configuration"** (ou **"Configuração"**)
   - Role até a seção **"Persistent Storage"** (ou **"Armazenamento Persistente"**)
   - Clique em **"+ Add Volume"** ou **"+ Adicionar Volume"**

3. **Configure os Dados do Volume**
   - **Name**: `uploads-storage` (ou qualquer nome descritivo)
   - **Source Path**: Deixe vazio ou use `/uploads-storage` (caminho no host - Coolify gerencia automaticamente)
     - ⚠️ **NÃO use `/root`** - isso é apenas um exemplo padrão
   - **Destination Path**: `/app/public/uploads` ⚠️ **IMPORTANTE: Deve ser exatamente este caminho**
     - ⚠️ **NÃO use `/tmp/root`** - isso é apenas um exemplo padrão
     - Este é o caminho **dentro do container** onde os arquivos serão salvos

4. **Salve e Reinicie**
   - Clique em **"Save"** ou **"Salvar"**
   - Reinicie a aplicação (ou faça um novo deploy)

### Verificação

Após configurar o volume:

1. **Faça upload de um banner ou logo** pela interface admin
2. **Reinicie o container** (ou faça um novo deploy)
3. **Verifique se o arquivo ainda está lá** - deve aparecer normalmente

### Estrutura de Diretórios

O volume persistente manterá:
```
/app/public/uploads/
├── banners/     # Banners promocionais
├── logos/       # Logos do site
└── stories/     # Stories do Instagram
```

## Alternativa: Storage Externo (S3, R2, etc.)

Para produção em escala, considere migrar para storage externo:

### Opções Recomendadas:
- **AWS S3** - Mais popular, integração fácil
- **Cloudflare R2** - Compatível com S3, sem custos de egress
- **DigitalOcean Spaces** - Simples e barato
- **Backblaze B2** - Econômico

### Vantagens do Storage Externo:
- ✅ Escalável (sem limite de espaço)
- ✅ Backup automático
- ✅ CDN integrado (imagens mais rápidas)
- ✅ Não ocupa espaço no servidor
- ✅ Funciona mesmo se o container reiniciar

### Implementação Futura

Se quiser migrar para S3/R2 no futuro, será necessário:
1. Instalar biblioteca (ex: `@aws-sdk/client-s3`)
2. Modificar `app/api/upload/route.ts` para salvar no S3
3. Modificar `app/uploads/[...path]/route.ts` para servir do S3
4. Configurar variáveis de ambiente (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, etc.)

## Troubleshooting

### Arquivos ainda são perdidos após configurar volume?

1. **Verifique o Destination Path**: Deve ser exatamente `/app/public/uploads` (não `/tmp/root` ou outro caminho)
2. **Verifique o Source Path**: Pode ficar vazio ou ser um caminho no host (ex: `/uploads-storage`)
3. **Verifique se o volume foi criado**: No Coolify, veja se aparece na lista de volumes
4. **Verifique permissões**: O container precisa ter permissão de escrita no diretório
5. **Reinicie após configurar**: O volume só é montado quando o container inicia

### Como verificar se o volume está funcionando?

1. Faça upload de uma imagem
2. Acesse o terminal do container no Coolify
3. Execute: `ls -la /app/public/uploads/banners/`
4. Você deve ver os arquivos lá
5. Reinicie o container
6. Execute o mesmo comando - os arquivos devem continuar lá

## Configuração Correta no Modal "Add Volume Mount"

Quando o modal aparecer, você verá campos pré-preenchidos com valores de exemplo. **Substitua pelos valores corretos:**

- **Name**: `uploads-storage` ✅ (pode manter ou mudar)
- **Source Path**: Deixe **vazio** ou use `/uploads-storage` 
  - ⚠️ **NÃO use `/root`** (isso é apenas exemplo)
  - O Coolify gerencia automaticamente o caminho no host
- **Destination Path**: `/app/public/uploads` ⚠️ **CRÍTICO: Substitua `/tmp/root` por este valor**
  - Este é o caminho **dentro do container Docker** onde os arquivos são salvos
  - Deve corresponder ao caminho usado no código: `public/uploads/`

## Notas Importantes

- ⚠️ O volume precisa ser configurado **antes** de fazer uploads importantes
- ⚠️ Arquivos já existentes **não** são migrados automaticamente para o volume
- ⚠️ Se você já tem arquivos e configurar o volume depois, eles serão perdidos no próximo deploy
- ✅ Após configurar o volume, todos os novos uploads serão persistentes
- ⚠️ **Destination Path** deve ser `/app/public/uploads` - este é o caminho dentro do container onde os arquivos são salvos
