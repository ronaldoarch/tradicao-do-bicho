/**
 * Cliente para integração com SuitPay Gateway
 * Documentação: https://docs.suitpay.app
 */

import crypto from 'crypto'

export interface SuitPayClientOptions {
  clientId: string
  clientSecret: string
  baseUrl?: string // Sandbox: https://sandbox.ws.suitpay.app, Produção: https://ws.suitpay.app
}

export interface SuitPayCreatePixPayload {
  requestNumber: string // Número do pedido (único)
  dueDate: string // Data de vencimento (AAAA-MM-DD) - para PIX pode ser hoje
  amount: number // Valor total
  shippingAmount?: number // Valor do frete (opcional)
  usernameCheckout: string // Username no checkout
  client: {
    name: string
    document: string // CPF/CNPJ
    phoneNumber: string // DDD+TELEFONE
    email: string
    address: {
      codIbge: string // Código IBGE do município
      street: string
      number: string
      complement?: string
      zipCode: string // CEP
      neighborhood: string
      city: string
      state: string // Sigla do estado (GO, SP, etc)
    }
  }
  products: Array<{
    description: string
    quantity: number
    value: number
  }>
  callbackUrl?: string // URL do webhook (opcional)
}

export interface SuitPayCreatePixResponse {
  idTransaction: string
  digitableLine?: string // Para boleto
  barcode?: string // Para boleto
  qrCode?: string // Para PIX
  qrCodeImage?: string // Para PIX (base64)
  response: string
}

export interface SuitPayWebhookPixPayload {
  idTransaction: string
  typeTransaction: string // "PIX"
  statusTransaction: string // "PAID_OUT", "CHARGEBACK"
  value: number
  payerName: string
  payerTaxId: string
  paymentDate: string // dd/MM/yyyy HH:mm:ss
  paymentCode: string
  requestNumber: string
  hash: string
}

/**
 * Valida hash do webhook da SuitPay
 */
export function validarHashWebhookSuitPay(
  payload: Omit<SuitPayWebhookPixPayload, 'hash'>,
  hashRecebido: string,
  clientSecret: string
): boolean {
  // 1. Concatene todos os valores dos campos (exceto hash) em ordem
  const valoresConcatenados = [
    payload.idTransaction,
    payload.typeTransaction,
    payload.statusTransaction,
    payload.value.toString(),
    payload.payerName,
    payload.payerTaxId,
    payload.paymentDate,
    payload.paymentCode,
    payload.requestNumber,
  ].join('')

  // 2. Concatene ClientSecret com o resultado
  const stringParaHash = clientSecret + valoresConcatenados

  // 3. Calcule SHA-256
  const hashCalculado = crypto.createHash('sha256').update(stringParaHash).digest('hex')

  // 4. Compare com o hash recebido
  return hashCalculado === hashRecebido
}

/**
 * Cria pagamento PIX via SuitPay
 */
export async function suitpayCreatePix(
  options: SuitPayClientOptions,
  payload: SuitPayCreatePixPayload
): Promise<SuitPayCreatePixResponse> {
  const baseUrl = options.baseUrl || 'https://sandbox.ws.suitpay.app'
  const url = `${baseUrl}/api/v1/gateway/request-pix`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ci: options.clientId,
      cs: options.clientSecret,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = `SuitPay API error (${response.status}): ${errorText}`
    
    try {
      const errorJson = JSON.parse(errorText)
      errorMessage = errorJson.message || errorJson.error || errorMessage
    } catch {
      // Se não conseguir parsear, usa o texto original
    }
    
    throw new Error(errorMessage)
  }

  return await response.json()
}

/**
 * Cria pagamento Boleto via SuitPay
 */
export async function suitpayCreateBoleto(
  options: SuitPayClientOptions,
  payload: SuitPayCreatePixPayload
): Promise<SuitPayCreatePixResponse> {
  const baseUrl = options.baseUrl || 'https://sandbox.ws.suitpay.app'
  const url = `${baseUrl}/api/v1/gateway/request-boleto`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ci: options.clientId,
      cs: options.clientSecret,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = `SuitPay API error (${response.status}): ${errorText}`
    
    try {
      const errorJson = JSON.parse(errorText)
      errorMessage = errorJson.message || errorJson.error || errorMessage
    } catch {
      // Se não conseguir parsear, usa o texto original
    }
    
    throw new Error(errorMessage)
  }

  return await response.json()
}

/**
 * Busca código IBGE por CEP usando API ViaCEP
 */
export async function buscarCodigoIBGEPorCEP(cep: string): Promise<string | null> {
  try {
    const cepLimpo = cep.replace(/\D/g, '')
    if (cepLimpo.length !== 8) return null

    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
    if (!response.ok) return null

    const data = await response.json()
    if (data.erro) return null

    // ViaCEP não retorna código IBGE diretamente, então vamos buscar em outra API
    // Usando API do IBGE
    if (data.uf && data.localidade) {
      const ibgeResponse = await fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/municipios?nome=${encodeURIComponent(data.localidade)}&$filter=municipio.uf.sigla eq '${data.uf}'`
      )
      
      if (ibgeResponse.ok) {
        const ibgeData = await ibgeResponse.json()
        if (ibgeData && ibgeData.length > 0) {
          return ibgeData[0].id.toString()
        }
      }
    }

    return null
  } catch (error) {
    console.error('Erro ao buscar código IBGE:', error)
    return null
  }
}
