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

/**
 * Inicializa cliente WhatsApp
 */
export async function getWhatsAppClient(): Promise<Client> {
  // Se já existe cliente inicializado e autenticado, retornar
  if (whatsappClient && whatsappClient.info && whatsappClient.info.wid) {
    return whatsappClient
  }

  // Se já está inicializando, aguardar
  if (isInitializing && initializationPromise) {
    return initializationPromise
  }

  // Iniciar nova inicialização
  isInitializing = true
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
        ],
      },
    })

    // Eventos do cliente
    client.on('qr', (qr) => {
      console.log('📱 QR Code gerado para autenticação WhatsApp. Escaneie com seu celular.')
      // Armazenar QR code para acesso via API
      currentQRCode = qr
    })

    client.on('ready', () => {
      console.log('✅ WhatsApp conectado e pronto!')
      whatsappClient = client
      isInitializing = false
      currentQRCode = null // Limpar QR code após conexão
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
      reject(new Error(`Falha na autenticação: ${msg}`))
    })

    client.on('disconnected', (reason) => {
      console.log('⚠️ WhatsApp desconectado:', reason)
      whatsappClient = null
      initializationPromise = null
      isInitializing = false
    })

    client.on('error', (error) => {
      console.error('❌ Erro no cliente WhatsApp:', error)
      if (!whatsappClient) {
        isInitializing = false
        initializationPromise = null
        reject(error)
      }
    })

    // Inicializar cliente
    client.initialize().catch((error) => {
      console.error('❌ Erro ao inicializar WhatsApp:', error)
      isInitializing = false
      initializationPromise = null
      reject(error)
    })
  })

  return initializationPromise
}

/**
 * Verifica se o cliente está pronto e completamente autenticado
 */
export function isWhatsAppReady(): boolean {
  return (
    whatsappClient !== null &&
    whatsappClient.info !== null &&
    whatsappClient.info.wid !== undefined &&
    whatsappClient.info.wid !== null
  )
}

/**
 * Aguarda até que o cliente esteja pronto e autenticado
 */
async function aguardarClientePronto(timeoutMs: number = 30000): Promise<Client> {
  const startTime = Date.now()
  
  // Primeiro, tentar obter o cliente (pode estar inicializando)
  try {
    const client = await getWhatsAppClient()
    
    // Verificar se está pronto
    if (client && client.info && client.info.wid && client.info.wid.user) {
      return client
    }
  } catch (error) {
    // Cliente pode estar inicializando, continuar verificando
  }
  
  // Aguardar até estar pronto
  while (Date.now() - startTime < timeoutMs) {
    if (whatsappClient && whatsappClient.info && whatsappClient.info.wid && whatsappClient.info.wid.user) {
      return whatsappClient
    }
    
    // Aguardar um pouco antes de verificar novamente
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  // Última tentativa
  if (whatsappClient && whatsappClient.info && whatsappClient.info.wid && whatsappClient.info.wid.user) {
    return whatsappClient
  }
  
  throw new Error('Timeout aguardando cliente WhatsApp ficar pronto. Verifique se o WhatsApp está conectado.')
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

    // Formatar número (remover caracteres não numéricos, adicionar código do país se necessário)
    const numeroFormatado = formatarNumeroWhatsApp(numero)

    // Criar MessageMedia do PDF
    const media = new MessageMedia(
      'application/pdf',
      pdfBuffer.toString('base64'),
      `relatorio_descarga_${new Date().toISOString().split('T')[0]}.pdf`
    )

    // Enviar mensagem com PDF
    const chatId = `${numeroFormatado}@c.us`
    const message = await client.sendMessage(chatId, media, {
      caption: mensagem || '📊 Relatório de Descarga',
    })

    return {
      success: true,
      messageId: message.id._serialized,
    }
  } catch (error: any) {
    console.error('Erro ao enviar PDF via WhatsApp Web:', error)
    
    // Mensagem de erro mais amigável
    let errorMessage = error.message || 'Erro desconhecido'
    if (errorMessage.includes('LID') || errorMessage.includes('No LID')) {
      errorMessage = 'WhatsApp não está completamente autenticado. Por favor, desconecte e reconecte o WhatsApp.'
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

    // Formatar número
    const numeroFormatado = formatarNumeroWhatsApp(numero)

    // Enviar mensagem
    const chatId = `${numeroFormatado}@c.us`
    const message = await client.sendMessage(chatId, mensagem)

    return {
      success: true,
      messageId: message.id._serialized,
    }
  } catch (error: any) {
    console.error('Erro ao enviar mensagem via WhatsApp Web:', error)
    
    // Mensagem de erro mais amigável
    let errorMessage = error.message || 'Erro desconhecido'
    if (errorMessage.includes('LID') || errorMessage.includes('No LID')) {
      errorMessage = 'WhatsApp não está completamente autenticado. Por favor, desconecte e reconecte o WhatsApp.'
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
