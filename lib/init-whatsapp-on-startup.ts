/**
 * Inicializa WhatsApp automaticamente quando o servidor iniciar
 * Este arquivo é importado no início do servidor Next.js
 */

let whatsappInitialized = false

export async function initWhatsAppOnStartup() {
  // Evitar inicialização múltipla
  if (whatsappInitialized) {
    return
  }

  // Só inicializar em produção ou se variável de ambiente estiver definida
  const shouldInit = process.env.INIT_WHATSAPP_ON_STARTUP === 'true' || process.env.NODE_ENV === 'production'

  if (!shouldInit) {
    console.log('ℹ️ Inicialização automática do WhatsApp desabilitada (use INIT_WHATSAPP_ON_STARTUP=true para habilitar)')
    return
  }

  try {
    console.log('🚀 Inicializando WhatsApp automaticamente...')
    const { getWhatsAppClient } = await import('./whatsapp-client')
    
    // Inicializar cliente (não bloqueia - inicializa em background)
    getWhatsAppClient().catch((error) => {
      console.error('❌ Erro ao inicializar WhatsApp automaticamente:', error.message)
      console.log('💡 Execute "npm run init:whatsapp" manualmente se necessário')
    })

    whatsappInitialized = true
  } catch (error: any) {
    console.error('❌ Erro ao carregar módulo WhatsApp:', error.message)
  }
}

// Inicializar automaticamente quando módulo for carregado (apenas em produção)
if (process.env.NODE_ENV === 'production' || process.env.INIT_WHATSAPP_ON_STARTUP === 'true') {
  // Aguardar um pouco para garantir que o servidor está pronto
  setTimeout(() => {
    initWhatsAppOnStartup()
  }, 5000) // 5 segundos após iniciar
}
