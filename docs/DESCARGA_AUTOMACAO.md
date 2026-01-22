# 📊 Automação de Envio de Relatório de Descarga

Este documento explica como configurar e usar o sistema automático de envio de relatórios de descarga via WhatsApp.

## 🎯 Funcionalidade

O sistema envia automaticamente um relatório em PDF via WhatsApp quando:
1. **Limites de descarga são atingidos** (há alertas não resolvidos)
2. **Está 10 minutos antes do fechamento** de uma extração (configurável)

## 📋 Pré-requisitos

1. **API do WhatsApp**: Você precisa de uma API do WhatsApp configurada. Opções:
   - Evolution API (recomendado)
   - WhatsApp Business API
   - Outras APIs compatíveis

2. **Variáveis de Ambiente**: Configure as seguintes variáveis no seu `.env`:

```env
# WhatsApp API Configuration
WHATSAPP_API_URL=http://localhost:8080
WHATSAPP_API_KEY=sua_chave_aqui
WHATSAPP_INSTANCE_ID=sua_instancia_id
WHATSAPP_TOKEN=seu_token_aqui

# Cron Secret Token (para proteger endpoint de verificação)
CRON_SECRET_TOKEN=seu_token_secreto_aqui
```

## ⚙️ Configuração no Admin

1. Acesse `/admin/descarga` no painel administrativo
2. Na seção "Configuração de Envio Automático", clique em "Configurar"
3. Preencha:
   - **Número do WhatsApp**: Formato `5511999999999` (código do país + DDD + número)
   - **Minutos antes do fechamento**: Padrão é 10 minutos
   - **Ativar envio automático**: Marque para ativar

## 🔄 Como Funciona

### Fluxo Automático

1. **Cron Job**: Executa a cada minuto (`scripts/cron/descarga-relatorio.sh`)
2. **Verificação**: Chama `/api/admin/descarga/verificar-e-enviar`
3. **Condições**:
   - Verifica se há alertas de descarga não resolvidos
   - Para cada extração ativa, verifica se está próximo do fechamento
   - Verifica se já foi enviado recentemente (evita duplicatas)
4. **Geração**: Se todas as condições forem atendidas:
   - Gera PDF do relatório
   - Envia via WhatsApp
   - Registra último envio

### Proteção contra Duplicatas

- Não envia novamente se já foi enviado há menos de 5 minutos
- Verifica por extração específica (não envia múltiplas vezes para a mesma extração)

## 📱 Formato do WhatsApp

O sistema usa a Evolution API (ou compatível) com o seguinte formato:

```json
POST /message/sendMedia/{instanceId}
{
  "number": "5511999999999",
  "media": "base64_do_pdf",
  "fileName": "relatorio_descarga_2024-01-20.pdf",
  "mimeType": "application/pdf",
  "caption": "📊 Relatório de Descarga..."
}
```

## 🛠️ APIs Disponíveis

### 1. Configurar Envio Automático
```
POST /api/admin/descarga/config
{
  "whatsappNumero": "5511999999999",
  "minutosAntesFechamento": 10,
  "ativo": true
}
```

### 2. Enviar Relatório Manualmente
```
POST /api/admin/descarga/enviar-relatorio
{
  "loteria": "PT RIO", // opcional
  "horario": "09:20", // opcional
  "numeroWhatsApp": "5511999999999" // opcional (usa config se não fornecido)
}
```

### 3. Verificar e Enviar Automaticamente
```
POST /api/admin/descarga/verificar-e-enviar
Headers: Authorization: Bearer {CRON_SECRET_TOKEN}
```

## 📝 Conteúdo do Relatório PDF

O PDF contém:
- **Cabeçalho**: Data, loteria e horário (se especificado)
- **Estatísticas de Descarga**: 
  - Modalidade e prêmio
  - Total apostado vs limite
  - Status (OK ou ultrapassado)
- **Alertas de Descarga**:
  - Modalidade e prêmio com limite ultrapassado
  - Total apostado e excedente
- **Rodapé**: Data/hora de geração

## 🔍 Logs

Os logs são salvos em:
- `/var/log/descarga-relatorio.log`

Para verificar os logs:
```bash
tail -f /var/log/descarga-relatorio.log
```

## 🚨 Troubleshooting

### Relatório não está sendo enviado

1. **Verifique se a configuração está ativa**:
   - Acesse `/admin/descarga` e confira a seção de configuração

2. **Verifique os logs**:
   ```bash
   tail -f /var/log/descarga-relatorio.log
   ```

3. **Verifique se há alertas**:
   - Deve haver alertas não resolvidos para enviar relatório

4. **Verifique horário**:
   - O sistema só envia 10 minutos antes do fechamento

5. **Verifique API do WhatsApp**:
   - Teste manualmente enviando um relatório
   - Verifique se as variáveis de ambiente estão corretas

### Erro ao enviar via WhatsApp

1. **Verifique URL da API**: `WHATSAPP_API_URL` está correto?
2. **Verifique autenticação**: `WHATSAPP_API_KEY` ou `WHATSAPP_TOKEN` está correto?
3. **Verifique instância**: `WHATSAPP_INSTANCE_ID` existe e está ativa?
4. **Verifique número**: Formato está correto? (sem espaços, apenas números)

## 📚 Exemplo de Uso

### Configuração Inicial

1. Configure variáveis de ambiente
2. Configure no admin: número WhatsApp e minutos antes
3. Ative o envio automático
4. O cron job começará a verificar automaticamente

### Envio Manual

Para enviar manualmente:
```bash
curl -X POST http://localhost:3000/api/admin/descarga/enviar-relatorio \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_session=seu_token" \
  -d '{
    "loteria": "PT RIO",
    "horario": "09:20"
  }'
```

## 🔐 Segurança

- O endpoint de verificação automática requer token de autenticação
- Configure `CRON_SECRET_TOKEN` em produção
- Use HTTPS em produção
- Mantenha as credenciais do WhatsApp seguras

## 📞 Suporte

Em caso de problemas:
1. Verifique os logs
2. Teste o envio manual
3. Verifique configuração da API do WhatsApp
4. Verifique se o cron está rodando: `ps aux | grep cron`
