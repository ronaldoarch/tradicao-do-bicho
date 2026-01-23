# 📊 Status da Automação de Envio de Relatórios de Descarga

## ✅ O que está implementado:

1. **Endpoint de Verificação e Envio** (`/api/admin/descarga/verificar-e-enviar`)
   - ✅ Verifica se está no horário de envio (15 minutos antes do fechamento)
   - ✅ Usa os horários mapeados em `horarios-envio-descarga.ts`
   - ✅ Verifica se há alertas de descarga não resolvidos
   - ✅ Verifica se há alertas relevantes para a extração específica
   - ✅ Gera PDF do relatório
   - ✅ Envia via WhatsApp (com ou sem API)
   - ✅ Proteção contra duplicatas (não envia se já foi enviado há menos de 5 minutos)
   - ✅ Atualiza último envio após sucesso

2. **Integração WhatsApp** (`lib/whatsapp-sender.ts`)
   - ✅ **Modo com API**: Suporta Evolution API ou APIs compatíveis
   - ✅ **Modo sem API**: Salva PDF em `public/pdfs-pendentes/` e cria link do WhatsApp Web
   - ✅ Formata número automaticamente
   - ✅ Fallback automático: se API falhar, usa modo manual

3. **Script de Cron** (`scripts/cron/descarga-relatorio.sh`)
   - ✅ Script criado e pronto para uso
   - ✅ Faz requisição POST para o endpoint
   - ✅ Usa autenticação Bearer token
   - ✅ Logs em `/var/log/descarga-relatorio.log`

4. **Horários Mapeados** (`data/horarios-envio-descarga.ts`)
   - ✅ Todos os horários configurados para 15 minutos antes do fechamento
   - ✅ Função `estaNoHorarioEnvio` implementada
   - ✅ Margem de 1 minuto antes até 2 minutos depois

5. **Listagem de PDFs Pendentes** (`/api/admin/descarga/pdfs-pendentes`)
   - ✅ Endpoint para listar PDFs salvos aguardando envio manual
   - ✅ Mostra nome, tamanho, data de criação

## 🔄 Como Funciona (Modo Sem API):

Quando **não há API do WhatsApp configurada**:

1. **Geração**: O sistema gera o PDF do relatório
2. **Salvamento**: Salva o PDF em `public/pdfs-pendentes/relatorio_descarga_[timestamp].pdf`
3. **Link**: Cria um link do WhatsApp Web com mensagem pré-formatada
4. **Notificação**: Retorna o link no resultado da API
5. **Envio Manual**: O admin pode:
   - Acessar `/api/admin/descarga/pdfs-pendentes` para ver lista de PDFs
   - Baixar o PDF
   - Usar o link do WhatsApp para abrir a conversa
   - Anexar o PDF manualmente

## ⚙️ Configuração Necessária:

### 1. Variáveis de Ambiente (.env) - OPCIONAL

**Se você tiver API do WhatsApp:**
```env
# WhatsApp API Configuration (OPCIONAL)
WHATSAPP_API_URL=http://localhost:8080
WHATSAPP_API_KEY=sua_chave_aqui
WHATSAPP_INSTANCE_ID=sua_instancia_id
WHATSAPP_TOKEN=seu_token_aqui
```

**Se NÃO tiver API do WhatsApp:**
- Não precisa configurar nada! O sistema funcionará em modo manual automaticamente.

**Sempre necessário:**
```env
# Cron Secret Token (para proteger endpoint de verificação)
CRON_SECRET_TOKEN=seu_token_secreto_aqui
```

### 2. Configuração no Admin
1. Acesse `/admin/descarga`
2. Configure:
   - **Número do WhatsApp**: Formato `5511999999999` (código do país + DDD + número)
   - **Ativar envio automático**: Marque para ativar

### 3. Cron Job
Configure o cron job para executar a cada minuto:

```bash
# Editar crontab
crontab -e

# Adicionar linha (ajuste o caminho e variáveis conforme necessário)
* * * * * API_URL=http://localhost:3000 CRON_SECRET_TOKEN=seu_token /caminho/para/projeto/scripts/cron/descarga-relatorio.sh >> /var/log/descarga-relatorio.log 2>&1
```

## 🔍 Como verificar se está funcionando:

### 1. Testar endpoint manualmente:
```bash
curl -X POST http://localhost:3000/api/admin/descarga/verificar-e-enviar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer seu_token_secreto"
```

### 2. Verificar logs:
```bash
tail -f /var/log/descarga-relatorio.log
```

### 3. Verificar PDFs pendentes:
```bash
# Via API
curl http://localhost:3000/api/admin/descarga/pdfs-pendentes \
  -H "Cookie: lotbicho_session=seu_token"

# Ou diretamente no servidor
ls -lh public/pdfs-pendentes/
```

### 4. Verificar se há alertas:
- Acesse `/admin/descarga`
- Verifique se há alertas de descarga não resolvidos
- O sistema só envia se houver alertas

## 📝 Resumo:

**Status**: ✅ **Implementação completa - Funciona COM ou SEM API do WhatsApp**

### Modo Sem API (Atual):
- ✅ Gera PDF automaticamente
- ✅ Salva em `public/pdfs-pendentes/`
- ✅ Cria link do WhatsApp Web
- ✅ Admin pode baixar e enviar manualmente
- ✅ Lista de PDFs pendentes disponível via API

### Modo Com API (Futuro):
- Se você configurar uma API do WhatsApp no futuro, o sistema usará automaticamente
- Basta adicionar as variáveis de ambiente e o sistema detectará e usará a API

**O sistema está pronto para uso!** Configure apenas:
1. Número do WhatsApp no admin
2. Ative a configuração
3. Configure o cron job

Os PDFs serão gerados automaticamente e salvos para envio manual via WhatsApp Web.
