/**
 * Script para inicializar WhatsApp na inicialização do servidor
 * Execute este script uma vez para conectar o WhatsApp
 */

import { getWhatsAppClient } from '../lib/whatsapp-client'

async function initWhatsApp() {
  console.log('🚀 Inicializando WhatsApp...')
  
  try {
    const client = await getWhatsAppClient()
    console.log('✅ WhatsApp inicializado com sucesso!')
    console.log('📱 Número conectado:', client.info?.wid.user)
    console.log('👤 Nome:', client.info?.pushname)
    
    // Manter processo vivo
    process.on('SIGINT', async () => {
      console.log('\n⚠️ Encerrando conexão WhatsApp...')
      await client.destroy()
      process.exit(0)
    })
  } catch (error: any) {
    console.error('❌ Erro ao inicializar WhatsApp:', error.message)
    process.exit(1)
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  initWhatsApp()
}

export default initWhatsApp
