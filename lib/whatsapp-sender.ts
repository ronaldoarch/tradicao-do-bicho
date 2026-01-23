/**
 * Funções para enviar mensagens e arquivos via WhatsApp
 * 
 * Suporta dois modos:
 * 1. Com API do WhatsApp (Evolution API, WhatsApp Business API, etc.)
 * 2. Sem API - salva PDF e cria link do WhatsApp Web (envio manual)
 */

import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export interface WhatsAppConfig {
  apiUrl?: string // URL da API do WhatsApp (ex: Evolution API, WhatsApp Business API)
  apiKey?: string // Chave da API
  instanceId?: string // ID da instância
  token?: string // Token de autenticação
}

/**
 * Envia PDF via WhatsApp
 * 
 * Se não houver API configurada, salva o PDF e retorna link do WhatsApp Web
 */
export async function enviarPDFWhatsApp(
  numero: string,
  pdfBuffer: Buffer,
  mensagem?: string,
  config?: WhatsAppConfig
): Promise<{ success: boolean; messageId?: string; error?: string; whatsappLink?: string; pdfPath?: string }> {
  try {
    // Formatar número (remover caracteres não numéricos, adicionar código do país se necessário)
    const numeroFormatado = formatarNumeroWhatsApp(numero)

    // Verificar se há API configurada
    const apiUrl = config?.apiUrl || process.env.WHATSAPP_API_URL
    const apiKey = config?.apiKey || process.env.WHATSAPP_API_KEY
    const instanceId = config?.instanceId || process.env.WHATSAPP_INSTANCE_ID
    const token = config?.token || process.env.WHATSAPP_TOKEN

    // Se não houver API configurada, usar modo manual (salvar PDF e criar link)
    if (!apiUrl && !instanceId) {
      return await enviarPDFWhatsAppManual(numeroFormatado, pdfBuffer, mensagem)
    }

    // Converter PDF para base64
    const pdfBase64 = pdfBuffer.toString('base64')

    // Enviar via API do WhatsApp
    const response = await fetch(`${apiUrl}/message/sendMedia/${instanceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'apikey': apiKey }),
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify({
        number: numeroFormatado,
        media: pdfBase64,
        fileName: `relatorio_descarga_${new Date().toISOString().split('T')[0]}.pdf`,
        mimeType: 'application/pdf',
        caption: mensagem || 'Relatório de Descarga',
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Erro HTTP: ${response.status}`)
    }

    const data = await response.json()
    return {
      success: true,
      messageId: data.key?.id || data.messageId,
    }
  } catch (error: any) {
    console.error('Erro ao enviar PDF via WhatsApp:', error)
    
    // Se falhar com API, tentar modo manual como fallback
    try {
      const numeroFormatado = formatarNumeroWhatsApp(numero)
      return await enviarPDFWhatsAppManual(numeroFormatado, pdfBuffer, mensagem)
    } catch (fallbackError: any) {
      return {
        success: false,
        error: error.message || 'Erro desconhecido',
      }
    }
  }
}

/**
 * Modo automático sem API: usa whatsapp-web.js para envio automático
 */
async function enviarPDFWhatsAppManual(
  numero: string,
  pdfBuffer: Buffer,
  mensagem?: string
): Promise<{ success: boolean; whatsappLink?: string; pdfPath?: string; error?: string; messageId?: string }> {
  try {
    // Tentar usar whatsapp-web.js para envio automático
    const { enviarPDFViaWhatsAppWeb } = await import('./whatsapp-client')
    
    const resultado = await enviarPDFViaWhatsAppWeb(numero, pdfBuffer, mensagem)
    
    if (resultado.success) {
      return {
        success: true,
        messageId: resultado.messageId,
      }
    }

    // Se falhar, salvar PDF como fallback
    console.warn('Falha ao enviar via WhatsApp Web, salvando PDF como fallback:', resultado.error)
    
    // Criar diretório para PDFs pendentes
    const pdfsDir = join(process.cwd(), 'public', 'pdfs-pendentes')
    await mkdir(pdfsDir, { recursive: true })

    // Nome do arquivo com timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `relatorio_descarga_${timestamp}.pdf`
    const pdfPath = join(pdfsDir, fileName)

    // Salvar PDF
    await writeFile(pdfPath, pdfBuffer)

    // Criar link do WhatsApp Web
    const mensagemEncoded = encodeURIComponent(
      (mensagem || '📊 Relatório de Descarga') +
      '\n\n' +
      '⚠️ Por favor, anexe o PDF que foi salvo no servidor.'
    )
    const whatsappLink = `https://wa.me/${numero}?text=${mensagemEncoded}`

    console.log(`PDF salvo em: ${pdfPath}`)
    console.log(`Link WhatsApp: ${whatsappLink}`)

    return {
      success: false, // Não foi enviado automaticamente
      whatsappLink,
      pdfPath: `/pdfs-pendentes/${fileName}`,
      error: resultado.error || 'Falha ao enviar automaticamente, PDF salvo para envio manual',
    }
  } catch (error: any) {
    console.error('Erro ao enviar PDF via WhatsApp Web:', error)
    
    // Fallback: salvar PDF
    try {
      const pdfsDir = join(process.cwd(), 'public', 'pdfs-pendentes')
      await mkdir(pdfsDir, { recursive: true })
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = `relatorio_descarga_${timestamp}.pdf`
      const pdfPath = join(pdfsDir, fileName)
      await writeFile(pdfPath, pdfBuffer)
      
      const mensagemEncoded = encodeURIComponent(mensagem || '📊 Relatório de Descarga')
      const whatsappLink = `https://wa.me/${numero}?text=${mensagemEncoded}`
      
      return {
        success: false,
        whatsappLink,
        pdfPath: `/pdfs-pendentes/${fileName}`,
        error: error.message || 'Erro ao enviar automaticamente',
      }
    } catch (fallbackError: any) {
      return {
        success: false,
        error: error.message || 'Erro ao salvar PDF',
      }
    }
  }
}

/**
 * Envia mensagem de texto via WhatsApp
 */
export async function enviarMensagemWhatsApp(
  numero: string,
  mensagem: string,
  config?: WhatsAppConfig
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const numeroFormatado = formatarNumeroWhatsApp(numero)

    const apiUrl =
      config?.apiUrl || process.env.WHATSAPP_API_URL || 'http://localhost:8080'
    const apiKey = config?.apiKey || process.env.WHATSAPP_API_KEY
    const instanceId =
      config?.instanceId || process.env.WHATSAPP_INSTANCE_ID
    const token = config?.token || process.env.WHATSAPP_TOKEN

    const response = await fetch(`${apiUrl}/message/sendText/${instanceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'apikey': apiKey }),
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify({
        number: numeroFormatado,
        text: mensagem,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Erro HTTP: ${response.status}`)
    }

    const data = await response.json()
    return {
      success: true,
      messageId: data.key?.id || data.messageId,
    }
  } catch (error: any) {
    console.error('Erro ao enviar mensagem via WhatsApp:', error)
    return {
      success: false,
      error: error.message || 'Erro desconhecido',
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
