/**
 * Funções para enviar mensagens e arquivos via WhatsApp
 */

export interface WhatsAppConfig {
  apiUrl?: string // URL da API do WhatsApp (ex: Evolution API, WhatsApp Business API)
  apiKey?: string // Chave da API
  instanceId?: string // ID da instância
  token?: string // Token de autenticação
}

/**
 * Envia PDF via WhatsApp
 */
export async function enviarPDFWhatsApp(
  numero: string,
  pdfBuffer: Buffer,
  mensagem?: string,
  config?: WhatsAppConfig
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Formatar número (remover caracteres não numéricos, adicionar código do país se necessário)
    const numeroFormatado = formatarNumeroWhatsApp(numero)

    // Usar API configurada ou padrão
    const apiUrl =
      config?.apiUrl || process.env.WHATSAPP_API_URL || 'http://localhost:8080'
    const apiKey = config?.apiKey || process.env.WHATSAPP_API_KEY
    const instanceId =
      config?.instanceId || process.env.WHATSAPP_INSTANCE_ID
    const token = config?.token || process.env.WHATSAPP_TOKEN

    // Converter PDF para base64
    const pdfBase64 = pdfBuffer.toString('base64')

    // Enviar via API do WhatsApp
    // Exemplo usando Evolution API ou similar
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
    return {
      success: false,
      error: error.message || 'Erro desconhecido',
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
