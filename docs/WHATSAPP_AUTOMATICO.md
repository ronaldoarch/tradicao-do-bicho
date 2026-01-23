# 📱 Envio Automático de WhatsApp (whatsapp-web.js)

Este documento explica como configurar o envio automático de relatórios via WhatsApp usando `whatsapp-web.js`, **sem precisar de API externa**.

## 🎯 Como Funciona

O sistema usa `whatsapp-web.js` que se conecta ao WhatsApp Web diretamente, permitindo envio automático de mensagens e arquivos sem necessidade de API externa.

## 📋 Pré-requisitos

1. **Node.js** instalado
2. **WhatsApp** no celular (para escanear QR code na primeira vez)
3. **Servidor sempre online** (para manter conexão ativa)

## 🚀 Configuração Inicial

### 1. Instalar Dependências

As dependências já foram instaladas automaticamente. Se necessário:

```bash
npm install whatsapp-web.js
```

### 2. Primeira Autenticação

Na primeira vez, você precisa escanear o QR code com seu WhatsApp:

```bash
npm run init:whatsapp
```

Ou execute diretamente:

```bash
tsx scripts/init-whatsapp.ts
```

**O que acontece:**
1. Um QR code será exibido no terminal/logs
2. Abra o WhatsApp no celular
3. Vá em **Configurações > Aparelhos conectados > Conectar um aparelho**
4. Escaneie o QR code exibido
5. Aguarde a confirmação: `✅ WhatsApp conectado e pronto!`

### 3. Sessão Salva

Após a primeira autenticação, a sessão é salva em `.wwebjs_auth/`. 
**Não será necessário escanear o QR code novamente** (a menos que desconecte manualmente).

## ⚙️ Configuração no Admin

1. Acesse `/admin/descarga`
2. Configure:
   - **Número do WhatsApp**: Formato `5511999999999` (código do país + DDD + número)
   - **Ativar envio automático**: Marque para ativar

## 🔄 Como Funciona a Automação

1. **Cron Job**: Executa a cada minuto (`scripts/cron/descarga-relatorio.sh`)
2. **Verificação**: Chama `/api/admin/descarga/verificar-e-enviar`
3. **Condições**:
   - Verifica se há alertas de descarga não resolvidos
   - Verifica se está no horário de envio (15 minutos antes do fechamento)
   - Verifica se já foi enviado recentemente (evita duplicatas)
4. **Envio Automático**: Se todas as condições forem atendidas:
   - Gera PDF do relatório
   - **Envia automaticamente via WhatsApp Web**
   - Registra último envio

## 📊 Verificar Status

### Via API:

```bash
# Verificar status da conexão
curl http://localhost:3000/api/admin/whatsapp/status \
  -H "Cookie: lotbicho_session=seu_token"
```

### Via Logs:

Os logs mostram:
- `✅ WhatsApp conectado e pronto!` - Conectado
- `📱 QR Code gerado` - Aguardando autenticação
- `❌ Falha na autenticação` - Erro na conexão

## 🔧 Manutenção

### Reiniciar Conexão

Se a conexão cair, o sistema tentará reconectar automaticamente. Para forçar reinicialização:

```bash
# Parar o servidor
# Remover sessão (opcional - vai pedir QR code novamente)
rm -rf .wwebjs_auth/

# Reiniciar servidor
npm start
```

### Verificar Conexão

O cliente WhatsApp é inicializado automaticamente quando necessário. Você pode verificar o status via:

- Logs do servidor
- Endpoint `/api/admin/whatsapp/status`
- Tentando enviar um relatório manualmente

## 🚨 Troubleshooting

### QR Code não aparece

1. Verifique os logs do servidor
2. Execute `npm run init:whatsapp` manualmente
3. Verifique se há erros no terminal

### WhatsApp desconecta frequentemente

1. **Mantenha o servidor sempre online**
2. WhatsApp Web desconecta se não houver atividade por muito tempo
3. O sistema reconecta automaticamente quando necessário

### Erro ao enviar mensagem

1. Verifique se WhatsApp está conectado: `/api/admin/whatsapp/status`
2. Verifique se o número está correto (formato: `5511999999999`)
3. Verifique logs do servidor para detalhes do erro

### "WhatsApp não está conectado"

1. Execute `npm run init:whatsapp` para inicializar
2. Escaneie o QR code se necessário
3. Aguarde a mensagem `✅ WhatsApp conectado e pronto!`

## 📝 Notas Importantes

1. **Primeira Vez**: Você precisa escanear o QR code uma vez
2. **Sessão Persistente**: Após autenticar, não precisa escanear novamente
3. **Servidor Online**: O servidor precisa estar sempre rodando para manter conexão
4. **Reconexão Automática**: Se desconectar, o sistema tenta reconectar automaticamente
5. **Sem API Externa**: Não precisa de Evolution API, Twilio ou outras APIs

## ✅ Vantagens

- ✅ **100% Automático**: Envia relatórios sem intervenção manual
- ✅ **Sem API Externa**: Não precisa pagar por serviços de API
- ✅ **Fácil Configuração**: Apenas escanear QR code uma vez
- ✅ **Sessão Persistente**: Não precisa escanear QR code toda vez
- ✅ **Reconexão Automática**: Reconecta se cair

## 🔐 Segurança

- A sessão do WhatsApp é salva localmente em `.wwebjs_auth/`
- **NÃO compartilhe** este diretório
- Adicione `.wwebjs_auth/` ao `.gitignore` (já está adicionado)
- Use HTTPS em produção

## 📞 Suporte

Em caso de problemas:
1. Verifique os logs do servidor
2. Verifique status via `/api/admin/whatsapp/status`
3. Tente reinicializar: `npm run init:whatsapp`
