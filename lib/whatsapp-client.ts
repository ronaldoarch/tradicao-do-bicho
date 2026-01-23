/**
 * Cliente WhatsApp usando whatsapp-web.js
 * Gerencia conexão única e reutilizável com WhatsApp Web
 */

import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

// Diretório para armazenar sessão do WhatsApp
const SESSION_DIR = join(process.cwd(), '.wwebjs_auth')

// Criar diretório se não existir
if (!existsSync(SESSION_DIR)) {
  mkdirSync(SESSION_DIR, { recursive: true })
}

let whatsappClient: Client | null = null
let isInitializing = false
let initializationPromise: Promise<Client> | null = null
let currentQRCode: string | null = null // Armazenar QR code atual
let readyTimestamp: number | null = null // Timestamp quando cliente ficou pronto
let initLock: Promise<void> | null = null // Lock para evitar inicializações simultâneas

// Exportar isInitializing para verificação externa
export function getIsInitializing(): boolean {
  return isInitializing
}

/**
 * Inicializa cliente WhatsApp
 */
export async function getWhatsAppClient(): Promise<Client> {
  // Se já existe cliente inicializado e autenticado, retornar
  if (whatsappClient && whatsappClient.info && whatsappClient.info.wid && readyTimestamp) {
    const tempoDesdeReady = Date.now() - readyTimestamp
    // Se já passou 20 segundos desde ready, está pronto
    if (tempoDesdeReady >= 20000) {
      return whatsappClient
    }
  }

  // Se já está inicializando, aguardar (CRÍTICO: não tentar inicializar novamente)
  if (isInitializing && initializationPromise) {
    console.log('⏳ Cliente já está inicializando, aguardando promise existente...')
    try {
      return await initializationPromise
    } catch (error: any) {
      // Se a inicialização falhou, limpar estado
      console.error('❌ Inicialização anterior falhou, limpando estado:', error?.message)
      isInitializing = false
      initializationPromise = null
      whatsappClient = null
      readyTimestamp = null
      initLock = null
      // Aguardar um pouco antes de tentar novamente para evitar loop
      await new Promise(resolve => setTimeout(resolve, 2000))
      // Continuar para tentar inicializar novamente
    }
  }

  // Aguardar lock se existir
  if (initLock) {
    console.log('⏳ Aguardando lock de inicialização...')
    await initLock
    // Após aguardar lock, verificar novamente se cliente está pronto
    if (whatsappClient && whatsappClient.info && whatsappClient.info.wid && readyTimestamp) {
      const tempoDesdeReady = Date.now() - readyTimestamp
      if (tempoDesdeReady >= 20000) {
        return whatsappClient
      }
    }
    // Se ainda não está pronto mas está inicializando, aguardar promise
    if (isInitializing && initializationPromise) {
      return await initializationPromise
    }
  }

  // Iniciar nova inicialização (garantir que não está inicializando)
  if (isInitializing) {
    console.warn('⚠️ Tentativa de inicializar enquanto já está inicializando, aguardando...')
    if (initializationPromise) {
      return initializationPromise
    }
  }
  
  // Criar lock para evitar múltiplas inicializações simultâneas
  let resolveLock: (() => void) | null = null
  initLock = new Promise((resolve) => {
    resolveLock = resolve
  })
  
  isInitializing = true
  console.log('🚀 Iniciando cliente WhatsApp...')
  
  initializationPromise = new Promise((resolve, reject) => {
    const client = new Client({
      authStrategy: new LocalAuth({
        dataPath: SESSION_DIR,
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--single-process', // Evitar múltiplos processos
        ],
      },
    })

    // Eventos do cliente
    client.on('qr', (qr) => {
      console.log('📱 QR Code gerado para autenticação WhatsApp. Escaneie com seu celular.')
      // Armazenar QR code para acesso via API
      currentQRCode = qr
    })

    client.on('ready', async () => {
      console.log('✅ WhatsApp conectado e pronto!')
      whatsappClient = client
      currentQRCode = null // Limpar QR code após conexão
      readyTimestamp = Date.now() // Registrar timestamp quando ficou pronto
      
      // Aguardar um pouco antes de começar a verificar o Store
      // O WhatsApp Web precisa de alguns segundos para carregar recursos
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Verificar o Store de forma mais eficiente com polling
      console.log('🔍 Verificando se Store está carregado...')
      const storeCarregado = await aguardarStoreCarregar(client, 60000) // Timeout de 60 segundos
      
      if (storeCarregado) {
        console.log('✅ Store carregado! Cliente WhatsApp completamente pronto para enviar mensagens!')
      } else {
        console.warn('⚠️ Store não carregou completamente após 60 segundos, mas continuando...')
      }
      
      isInitializing = false
      if (resolveLock) resolveLock()
      initLock = null
      resolve(client)
    })

    client.on('authenticated', () => {
      console.log('✅ WhatsApp autenticado!')
    })

    client.on('auth_failure', (msg) => {
      console.error('❌ Falha na autenticação WhatsApp:', msg)
      isInitializing = false
      whatsappClient = null
      initializationPromise = null
      if (resolveLock) resolveLock()
      initLock = null
      reject(new Error(`Falha na autenticação: ${msg}`))
    })

    client.on('disconnected', (reason) => {
      console.log('⚠️ WhatsApp desconectado:', reason)
      whatsappClient = null
      initializationPromise = null
      isInitializing = false
      readyTimestamp = null // Limpar timestamp ao desconectar
      if (resolveLock) resolveLock()
      initLock = null
    })

    client.on('error', (error) => {
      console.error('❌ Erro no cliente WhatsApp:', error)
      if (!whatsappClient) {
        isInitializing = false
        initializationPromise = null
        if (resolveLock) resolveLock()
        initLock = null
        reject(error)
      }
    })

    // Inicializar cliente
    client.initialize().catch((error) => {
      console.error('❌ Erro ao inicializar WhatsApp:', error)
      isInitializing = false
      initializationPromise = null
      if (resolveLock) resolveLock()
      initLock = null
      reject(error)
    })
  })

  return initializationPromise
}

/**
 * Verifica se o cliente está pronto e completamente autenticado
 * Aguarda pelo menos 20 segundos após o evento 'ready' para garantir que LID está carregado
 */
export function isWhatsAppReady(): boolean {
  if (!whatsappClient || !whatsappClient.info || !whatsappClient.info.wid) {
    return false
  }
  
  // Se não tem timestamp de quando ficou pronto, não está pronto ainda
  if (!readyTimestamp) {
    return false
  }
  
  // Aguardar pelo menos 20 segundos após o evento 'ready'
  const tempoDesdeReady = Date.now() - readyTimestamp
  return tempoDesdeReady >= 20000
}

/**
 * Aguarda até que o cliente esteja pronto e autenticado
 * Garante que pelo menos 20 segundos se passaram desde o evento 'ready'
 */
async function aguardarClientePronto(timeoutMs: number = 90000): Promise<Client> {
  const startTime = Date.now()
  
  // Primeiro, tentar obter o cliente (pode estar inicializando)
  try {
    const client = await getWhatsAppClient()
    
    // Verificar se está pronto (com delay de 20 segundos após ready)
    if (client && client.info && client.info.wid && client.info.wid.user && readyTimestamp) {
      const tempoDesdeReady = Date.now() - readyTimestamp
      if (tempoDesdeReady >= 20000) {
        return client
      }
      // Se ainda não passou 20 segundos, aguardar o restante
      const tempoRestante = 20000 - tempoDesdeReady
      console.log(`⏳ Aguardando mais ${Math.ceil(tempoRestante / 1000)} segundos para garantir LID está carregado...`)
      await new Promise(resolve => setTimeout(resolve, tempoRestante))
      return client
    }
  } catch (error) {
    // Cliente pode estar inicializando, continuar verificando
    console.log('⏳ Cliente ainda inicializando, aguardando...')
  }
  
  // Aguardar até estar pronto (com delay de 20 segundos após ready)
  while (Date.now() - startTime < timeoutMs) {
    if (whatsappClient && whatsappClient.info && whatsappClient.info.wid && whatsappClient.info.wid.user && readyTimestamp) {
      const tempoDesdeReady = Date.now() - readyTimestamp
      if (tempoDesdeReady >= 20000) {
        return whatsappClient
      }
      // Se ainda não passou 20 segundos, aguardar o restante
      const tempoRestante = Math.min(20000 - tempoDesdeReady, 1000)
      await new Promise(resolve => setTimeout(resolve, tempoRestante))
      if (whatsappClient && whatsappClient.info && whatsappClient.info.wid && whatsappClient.info.wid.user) {
        return whatsappClient
      }
    }
    
    // Aguardar um pouco antes de verificar novamente
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  // Última tentativa
  if (whatsappClient && whatsappClient.info && whatsappClient.info.wid && whatsappClient.info.wid.user && readyTimestamp) {
    const tempoDesdeReady = Date.now() - readyTimestamp
    if (tempoDesdeReady >= 20000) {
      return whatsappClient
    }
    // Aguardar o restante do tempo
    const tempoRestante = 20000 - tempoDesdeReady
    console.log(`⏳ Aguardando mais ${Math.ceil(tempoRestante / 1000)} segundos para garantir LID está carregado...`)
    await new Promise(resolve => setTimeout(resolve, tempoRestante))
    return whatsappClient
  }
  
  throw new Error('Timeout aguardando cliente WhatsApp ficar pronto. Verifique se o WhatsApp está conectado.')
}

/**
 * Aguarda até que o Store esteja carregado com polling inteligente
 */
async function aguardarStoreCarregar(client: Client, timeoutMs: number = 60000): Promise<boolean> {
  const startTime = Date.now()
  let tentativas = 0
  const intervaloInicial = 1000 // Começar verificando a cada 1 segundo
  const intervaloMaximo = 5000 // Máximo de 5 segundos entre verificações
  
  while (Date.now() - startTime < timeoutMs) {
    tentativas++
    try {
      const page = (client as any).pupPage
      if (!page) {
        await new Promise(resolve => setTimeout(resolve, intervaloInicial))
        continue
      }

      const storeInfo = await page.evaluate(() => {
        try {
          if (typeof window === 'undefined') return { store: false, me: false, msg: false }
          const Store = (window as any).Store
          if (!Store) return { store: false, me: false, msg: false }
          
          return {
            store: true,
            me: !!(Store.Me && Store.Me.wid),
            msg: !!(Store.Msg && Store.Msg.send),
            widFactory: !!(Store.WidFactory && Store.WidFactory.createWid),
          }
        } catch (error) {
          return { store: false, me: false, msg: false, error: String(error) }
        }
      }).catch(() => ({ store: false, me: false, msg: false }))

      if (storeInfo.store) {
        if (storeInfo.me || storeInfo.msg || storeInfo.widFactory) {
          console.log(`✅ Store carregado após ${tentativas} tentativa(s) (${Math.round((Date.now() - startTime) / 1000)}s)`)
          return true
        } else {
          // Store existe mas ainda não tem tudo carregado
          if (tentativas % 5 === 0) {
            console.log(`⏳ Store existe mas ainda carregando componentes... (tentativa ${tentativas})`)
          }
        }
      } else {
        if (tentativas % 5 === 0) {
          console.log(`⏳ Aguardando Store carregar... (tentativa ${tentativas}, ${Math.round((Date.now() - startTime) / 1000)}s)`)
        }
      }
    } catch (error) {
      if (tentativas % 10 === 0) {
        console.warn(`⚠️ Erro ao verificar Store (tentativa ${tentativas}):`, error)
      }
    }
    
    // Aumentar intervalo gradualmente para não sobrecarregar
    const intervalo = Math.min(intervaloInicial * Math.floor(tentativas / 5), intervaloMaximo)
    await new Promise(resolve => setTimeout(resolve, intervalo))
  }
  
  console.warn(`⚠️ Timeout aguardando Store carregar após ${tentativas} tentativas (${Math.round(timeoutMs / 1000)}s)`)
  return false
}

/**
 * Verifica se o LID está disponível no cliente WhatsApp
 */
async function verificarLIDDisponivel(client: Client): Promise<boolean> {
  try {
    const page = (client as any).pupPage
    if (!page) {
      console.warn('⚠️ Não foi possível acessar a página do Puppeteer')
      return false
    }

    // Verificar se o Store está carregado e se o LID está disponível
    const lidDisponivel = await page.evaluate(() => {
      try {
        if (typeof window === 'undefined') return false
        const Store = (window as any).Store
        if (!Store) return false
        
        // Tentar acessar o LID através do Store
        // O LID geralmente está em Store.Me ou Store.WidFactory
        if (Store.Me && Store.Me.wid) {
          return true
        }
        if (Store.WidFactory && Store.WidFactory.createWid) {
          return true
        }
        
        // Verificar se há algum método de envio disponível
        if (Store.Msg && Store.Msg.send) {
          return true
        }
        
        return false
      } catch (error) {
        console.error('Erro ao verificar LID:', error)
        return false
      }
    }).catch(() => false)

    return lidDisponivel
  } catch (error) {
    console.warn('⚠️ Erro ao verificar LID:', error)
    return false
  }
}

/**
 * Aguarda até que o LID esteja disponível
 */
async function aguardarLIDDisponivel(client: Client, timeoutMs: number = 30000): Promise<boolean> {
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeoutMs) {
    const lidDisponivel = await verificarLIDDisponivel(client)
    if (lidDisponivel) {
      console.log('✅ LID confirmado como disponível!')
      return true
    }
    
    // Aguardar 2 segundos antes de verificar novamente
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  console.warn('⚠️ Timeout aguardando LID ficar disponível')
  return false
}

/**
 * Envia PDF via WhatsApp usando whatsapp-web.js
 */
export async function enviarPDFViaWhatsAppWeb(
  numero: string,
  pdfBuffer: Buffer,
  mensagem?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Verificar se cliente está pronto
    if (!isWhatsAppReady()) {
      return {
        success: false,
        error: 'WhatsApp não está conectado. Por favor, conecte o WhatsApp primeiro.',
      }
    }

    // Obter cliente e aguardar até estar completamente pronto
    const client = await aguardarClientePronto()

    // Verificar novamente se tem info válido
    if (!client.info || !client.info.wid) {
      return {
        success: false,
        error: 'WhatsApp não está completamente autenticado. Por favor, reconecte.',
      }
    }

    // Verificar se o LID está disponível antes de tentar enviar
    console.log('🔍 Verificando se LID está disponível antes de enviar...')
    const lidDisponivel = await aguardarLIDDisponivel(client, 30000)
    
    if (!lidDisponivel) {
      console.warn('⚠️ LID não está disponível após 30 segundos de espera')
      return {
        success: false,
        error: 'WhatsApp não está completamente autenticado. O LID ainda não está disponível. Por favor, desconecte e reconecte o WhatsApp.',
      }
    }

    // Formatar número (remover caracteres não numéricos, adicionar código do país se necessário)
    const numeroFormatado = formatarNumeroWhatsApp(numero)

    // Criar MessageMedia do PDF
    const media = new MessageMedia(
      'application/pdf',
      pdfBuffer.toString('base64'),
      `relatorio_descarga_${new Date().toISOString().split('T')[0]}.pdf`
    )

    // Enviar mensagem com PDF
    console.log(`📤 Enviando PDF para ${numeroFormatado}...`)
    const chatId = `${numeroFormatado}@c.us`
    const message = await client.sendMessage(chatId, media, {
      caption: mensagem || '📊 Relatório de Descarga',
    })

    console.log('✅ PDF enviado com sucesso!')
    return {
      success: true,
      messageId: message.id._serialized,
    }
  } catch (error: any) {
    console.error('Erro ao enviar PDF via WhatsApp Web:', error)
    
    // Mensagem de erro mais amigável
    let errorMessage = error.message || 'Erro desconhecido'
    if (errorMessage.includes('LID') || errorMessage.includes('No LID')) {
      errorMessage = 'WhatsApp não está completamente autenticado. O LID não está disponível. Por favor, desconecte e reconecte o WhatsApp.'
    }
    
    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Envia mensagem de texto via WhatsApp usando whatsapp-web.js
 */
export async function enviarMensagemViaWhatsAppWeb(
  numero: string,
  mensagem: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Verificar se cliente está pronto
    if (!isWhatsAppReady()) {
      return {
        success: false,
        error: 'WhatsApp não está conectado. Por favor, conecte o WhatsApp primeiro.',
      }
    }

    // Obter cliente e aguardar até estar completamente pronto
    const client = await aguardarClientePronto()

    // Verificar novamente se tem info válido
    if (!client.info || !client.info.wid) {
      return {
        success: false,
        error: 'WhatsApp não está completamente autenticado. Por favor, reconecte.',
      }
    }

    // Verificar se o LID está disponível antes de tentar enviar
    console.log('🔍 Verificando se LID está disponível antes de enviar mensagem...')
    const lidDisponivel = await aguardarLIDDisponivel(client, 30000)
    
    if (!lidDisponivel) {
      console.warn('⚠️ LID não está disponível após 30 segundos de espera')
      return {
        success: false,
        error: 'WhatsApp não está completamente autenticado. O LID ainda não está disponível. Por favor, desconecte e reconecte o WhatsApp.',
      }
    }

    // Formatar número
    const numeroFormatado = formatarNumeroWhatsApp(numero)

    // Enviar mensagem
    console.log(`📤 Enviando mensagem para ${numeroFormatado}...`)
    const chatId = `${numeroFormatado}@c.us`
    const message = await client.sendMessage(chatId, mensagem)

    console.log('✅ Mensagem enviada com sucesso!')
    return {
      success: true,
      messageId: message.id._serialized,
    }
  } catch (error: any) {
    console.error('Erro ao enviar mensagem via WhatsApp Web:', error)
    
    // Mensagem de erro mais amigável
    let errorMessage = error.message || 'Erro desconhecido'
    if (errorMessage.includes('LID') || errorMessage.includes('No LID')) {
      errorMessage = 'WhatsApp não está completamente autenticado. O LID não está disponível. Por favor, desconecte e reconecte o WhatsApp.'
    }
    
    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Formata número para WhatsApp (remove caracteres não numéricos, adiciona código do país)
 */
function formatarNumeroWhatsApp(numero: string): string {
  // Remove tudo exceto números
  let numeroLimpo = numero.replace(/\D/g, '')

  // Se não começar com código do país (assumindo Brasil = 55), adiciona
  if (!numeroLimpo.startsWith('55') && numeroLimpo.length === 11) {
    numeroLimpo = '55' + numeroLimpo
  }

  return numeroLimpo
}

/**
 * Obtém instância do cliente WhatsApp (se disponível)
 * Use apenas para leitura, não para inicialização
 */
export function getWhatsAppClientInstance(): Client | null {
  return whatsappClient
}

/**
 * Obtém QR code atual (se disponível)
 */
export function getCurrentQRCode(): string | null {
  return currentQRCode
}

/**
 * Limpa QR code atual
 */
export function clearQRCode(): void {
  currentQRCode = null
}

/**
 * Desconecta cliente WhatsApp
 */
export async function desconectarWhatsApp(): Promise<void> {
  if (whatsappClient) {
    try {
      await whatsappClient.destroy()
    } catch (error) {
      console.error('Erro ao destruir cliente WhatsApp:', error)
    }
    whatsappClient = null
    initializationPromise = null
    isInitializing = false
    currentQRCode = null
    readyTimestamp = null // Limpar timestamp ao desconectar
    if (initLock) {
      // Resolver lock se existir
      const lock = initLock
      initLock = null
      // Não podemos resolver diretamente, mas podemos limpar
    }
  }
}

/**
 * Força reconexão do WhatsApp (desconecta e reconecta)
 */
export async function reconectarWhatsApp(): Promise<void> {
  console.log('🔄 Forçando reconexão do WhatsApp...')
  await desconectarWhatsApp()
  
  // Aguardar um pouco antes de reconectar
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Tentar reconectar
  try {
    await getWhatsAppClient()
  } catch (error) {
    console.error('Erro ao reconectar WhatsApp:', error)
    throw error
  }
}
