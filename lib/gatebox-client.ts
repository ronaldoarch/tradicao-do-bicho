/**
 * Cliente para integração com Gatebox Gateway
 * Documentação baseada na coleção Postman fornecida
 */

import { prisma } from './prisma'
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production'
const ALGORITHM = 'aes-256-cbc'

function decrypt(encryptedText: string): string {
  try {
    const parts = encryptedText.split(':')
    const iv = Buffer.from(parts[0], 'hex')
    const encrypted = parts[1]
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    console.error('Erro ao descriptografar:', error)
    throw error
  }
}

export interface GateboxClientOptions {
  username: string // CNPJ ou username
  password: string
  baseUrl?: string // Padrão: https://api.gatebox.com.br
}

/**
 * Busca configurações do Gatebox do banco de dados
 * Retorna null se não estiver configurado ou não estiver ativo
 */
export async function getGateboxConfigFromDB(): Promise<GateboxClientOptions | null> {
  try {
    const config = await prisma.configuracaoGatebox.findFirst({
      where: { ativo: true },
    })

    if (!config || !config.username || !config.password) {
      return null
    }

    // Descriptografar senha
    const passwordDecrypted = decrypt(config.password)

    return {
      username: config.username,
      password: passwordDecrypted,
      baseUrl: config.baseUrl || 'https://api.gatebox.com.br',
    }
  } catch (error) {
    console.error('Erro ao buscar configuração do Gatebox do banco:', error)
    return null
  }
}

/**
 * Busca configurações do Gatebox (primeiro do banco, depois de env vars)
 */
export async function getGateboxConfig(): Promise<GateboxClientOptions | null> {
  // Tentar buscar do banco primeiro
  const dbConfig = await getGateboxConfigFromDB()
  if (dbConfig) {
    return dbConfig
  }

  // Fallback para variáveis de ambiente
  const username = process.env.GATEBOX_USERNAME
  const password = process.env.GATEBOX_PASSWORD
  const baseUrl = process.env.GATEBOX_BASE_URL || 'https://api.gatebox.com.br'

  if (!username || !password) {
    return null
  }

  return {
    username,
    password,
    baseUrl,
  }
}

export interface GateboxAuthResponse {
  access_token: string
  token_type?: string
  expires_in?: number
}

export interface GateboxCreatePixPayload {
  externalId: string // ID de conciliação único
  amount: number // Valor do depósito
  document?: string // CPF/CNPJ do pagador
  name?: string // Nome completo do pagador
  email?: string // E-mail do pagador
  phone?: string // Telefone do pagador (ex: +5514987654321)
  identification?: string // Descrição a ser exibida no momento do pagamento
  expire?: number // Tempo de expiração do PIX em segundos (padrão: 3600)
  description?: string // Descrição da transação
}

export interface GateboxCreatePixResponse {
  qrCode?: string // QR Code em base64 ou texto
  qrCodeText?: string // Texto do QR Code para copiar
  transactionId?: string // ID da transação
  endToEnd?: string // End-to-end ID
  pixKey?: string // Chave PIX
  expiresAt?: string // Data de expiração
}

export interface GateboxStatusResponse {
  transactionId?: string
  externalId?: string
  endToEnd?: string
  status?: string // "pending", "paid", "expired", "cancelled"
  amount?: number
  paidAt?: string
  createdAt?: string
}

export interface GateboxBalanceResponse {
  balance?: number
  availableBalance?: number
  pendingBalance?: number
}

export interface GateboxPixKeyValidationResponse {
  valid?: boolean
  key?: string
  keyType?: string // "CPF", "CNPJ", "EMAIL", "PHONE", "RANDOM"
  name?: string
  account?: string
}

export interface GateboxWithdrawPayload {
  externalId: string // ID de conciliação único
  key: string // Chave PIX do recebedor
  name: string // Nome completo do recebedor
  description?: string // Descrição da transação (opcional)
  amount: number // Valor do saque
  documentNumber?: string // CPF/CNPJ do recebedor (obrigatório se validação de chave estiver ativa)
}

export interface GateboxWithdrawResponse {
  transactionId?: string
  endToEnd?: string
  status?: string
  amount?: number
}

// Cache de token para evitar múltiplas autenticações
let tokenCache: {
  token: string
  expiresAt: number
} | null = null

/**
 * Autentica no Gatebox e retorna o access token
 */
export async function gateboxAuthenticate(
  options: GateboxClientOptions
): Promise<string> {
  // Verificar se há token válido em cache
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token
  }

  const baseUrl = options.baseUrl || 'https://api.gatebox.com.br'
  const url = `${baseUrl}/v1/customers/auth/sign-in`

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: options.username,
        password: options.password,
      }),
      // Adicionar timeout
      signal: AbortSignal.timeout(30000), // 30 segundos
    })
  } catch (fetchError: any) {
    // Erro de rede ou timeout
    if (fetchError.name === 'AbortError' || fetchError.name === 'TimeoutError') {
      throw new Error('Timeout ao conectar com a API do Gatebox. Verifique sua conexão ou tente novamente.')
    }
    if (fetchError.code === 'ENOTFOUND' || fetchError.code === 'ECONNREFUSED') {
      throw new Error(`Não foi possível conectar com a API do Gatebox (${baseUrl}). Verifique se a URL está correta e se o serviço está disponível.`)
    }
    throw new Error(`Erro de conexão com Gatebox: ${fetchError.message}`)
  }

  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = `Gatebox API authentication error (${response.status}): ${errorText}`
    
    // Tratar erro 502 especificamente
    if (response.status === 502) {
      errorMessage = `Serviço Gatebox não está acessível (502). Verifique se a URL está correta (${baseUrl}) e se o serviço está disponível.`
    }
    
    try {
      const errorJson = JSON.parse(errorText)
      errorMessage = errorJson.message || errorJson.error || errorMessage
    } catch {
      // Se não conseguir parsear, verifica se é HTML (erro de proxy/gateway)
      if (errorText.includes('<!DOCTYPE html>') || errorText.includes('<html')) {
        errorMessage = `Serviço Gatebox não está acessível. A URL ${baseUrl} pode estar incorreta ou o serviço está temporariamente indisponível.`
      }
    }
    
    throw new Error(errorMessage)
  }

  const data: GateboxAuthResponse = await response.json()
  
  if (!data.access_token) {
    throw new Error('Token de acesso não retornado pela API')
  }

  // Cachear token (expira em 1 hora por padrão, ou conforme expires_in)
  const expiresIn = data.expires_in || 3600
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (expiresIn - 60) * 1000, // Subtrai 1 minuto para segurança
  }

  return data.access_token
}

/**
 * Cria pagamento PIX via Gatebox (Cash-In)
 */
export async function gateboxCreatePix(
  options: GateboxClientOptions,
  payload: GateboxCreatePixPayload
): Promise<GateboxCreatePixResponse> {
  const baseUrl = options.baseUrl || 'https://api.gatebox.com.br'
  const url = `${baseUrl}/v1/customers/pix/create-immediate-qrcode`

  // Autenticar primeiro
  const token = await gateboxAuthenticate(options)

  // Preparar body removendo campos undefined/null conforme documentação Postman
  const requestBody: any = {
    externalId: payload.externalId,
    amount: payload.amount,
    expire: payload.expire || 3600, // Padrão: 1 hora
  }
  
  // Adicionar campos opcionais apenas se estiverem definidos
  if (payload.document) requestBody.document = payload.document
  if (payload.name) requestBody.name = payload.name
  if (payload.email) requestBody.email = payload.email
  if (payload.phone) requestBody.phone = payload.phone
  if (payload.identification) requestBody.identification = payload.identification
  if (payload.description) requestBody.description = payload.description

  // Log do body que será enviado (sem senha)
  console.log('📤 Body enviado para Gatebox:', JSON.stringify(requestBody, null, 2))

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
      // Adicionar timeout
      signal: AbortSignal.timeout(30000), // 30 segundos
    })
  } catch (fetchError: any) {
    // Erro de rede ou timeout
    if (fetchError.name === 'AbortError' || fetchError.name === 'TimeoutError') {
      throw new Error('Timeout ao criar PIX no Gatebox. Tente novamente.')
    }
    if (fetchError.code === 'ENOTFOUND' || fetchError.code === 'ECONNREFUSED') {
      throw new Error(`Não foi possível conectar com a API do Gatebox (${baseUrl}). Verifique se a URL está correta.`)
    }
    throw new Error(`Erro de conexão com Gatebox: ${fetchError.message}`)
  }

  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = `Gatebox API error (${response.status}): ${errorText}`
    
    // Tratar erro 502 especificamente
    if (response.status === 502) {
      errorMessage = `Serviço Gatebox não está acessível (502). Verifique se a URL está correta (${baseUrl}) e se o serviço está disponível.`
    }
    
    try {
      const errorJson = JSON.parse(errorText)
      errorMessage = errorJson.message || errorJson.error || errorMessage
    } catch {
      // Se não conseguir parsear, verifica se é HTML (erro de proxy/gateway)
      if (errorText.includes('<!DOCTYPE html>') || errorText.includes('<html')) {
        errorMessage = `Serviço Gatebox não está acessível. A URL ${baseUrl} pode estar incorreta ou o serviço está temporariamente indisponível. Verifique a configuração do gateway no painel administrativo.`
      }
    }
    
    throw new Error(errorMessage)
  }

  const responseData = await response.json()
  
  // Log detalhado da resposta para debug
  console.log('📦 Resposta completa da Gatebox API:', JSON.stringify(responseData, null, 2))
  
  // Verificar se a resposta tem estrutura válida
  if (!responseData || typeof responseData !== 'object') {
    console.error('❌ Resposta da Gatebox não é um objeto válido:', responseData)
    throw new Error('Resposta inválida da API Gatebox')
  }
  
  // A resposta da Gatebox vem com estrutura { statusCode: 200, data: {...} }
  // ou diretamente como objeto com os campos
  const data = responseData.data || responseData
  
  // Mapear campos conforme estrutura real da resposta Gatebox
  // A resposta mostra: data.key contém o QR Code PIX (texto)
  // data.identifier ou data.uuid pode ser usado como transactionId
  const result = {
    qrCode: data.qrCode || data.qrCodeImage || data.qrcode || data.qrcodeImage,
    qrCodeText: data.key || data.qrCodeText || data.qrCode || data.qrcodeText || data.qrcode, // 'key' contém o QR Code PIX
    transactionId: data.identifier || data.uuid || data.transactionId || data.id || data.transaction_id,
    endToEnd: data.endToEnd || data.end_to_end || data.endToEndId,
    pixKey: data.pixKey || data.pix_key || data.chavePix,
    expiresAt: data.expiresAt || data.expireAt || data.expires_at || (data.expire ? new Date(Date.now() + data.expire * 1000).toISOString() : undefined),
  }
  
  // Log do resultado processado
  console.log('✅ Dados processados da Gatebox:', {
    temQrCode: !!result.qrCode,
    temQrCodeText: !!result.qrCodeText,
    temTransactionId: !!result.transactionId,
    temEndToEnd: !!result.endToEnd,
    qrCodeTextPreview: result.qrCodeText ? result.qrCodeText.substring(0, 50) + '...' : 'não encontrado',
  })
  
  return result
}

/**
 * Consulta status de uma transação PIX
 */
export async function gateboxGetStatus(
  options: GateboxClientOptions,
  params: {
    transactionId?: string
    externalId?: string
    endToEnd?: string
  }
): Promise<GateboxStatusResponse> {
  const baseUrl = options.baseUrl || 'https://api.gatebox.com.br'
  
  // Construir query string
  const queryParams = new URLSearchParams()
  if (params.transactionId) queryParams.append('transactionId', params.transactionId)
  if (params.externalId) queryParams.append('externalId', params.externalId)
  if (params.endToEnd) queryParams.append('endToEnd', params.endToEnd)

  const url = `${baseUrl}/v1/customers/pix/status?${queryParams.toString()}`

  // Autenticar primeiro
  const token = await gateboxAuthenticate(options)

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = `Gatebox API error (${response.status}): ${errorText}`
    
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
 * Consulta saldo da conta
 */
export async function gateboxGetBalance(
  options: GateboxClientOptions
): Promise<GateboxBalanceResponse> {
  const baseUrl = options.baseUrl || 'https://api.gatebox.com.br'
  const url = `${baseUrl}/v1/customers/account/balance`

  // Autenticar primeiro
  const token = await gateboxAuthenticate(options)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = `Gatebox API error (${response.status}): ${errorText}`
    
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
 * Valida chave PIX
 */
export async function gateboxValidatePixKey(
  options: GateboxClientOptions,
  pixKey: string
): Promise<GateboxPixKeyValidationResponse> {
  const baseUrl = options.baseUrl || 'https://api.gatebox.com.br'
  const url = `${baseUrl}/v1/customers/pix/pix-search?dict=${encodeURIComponent(pixKey)}`

  // Autenticar primeiro
  const token = await gateboxAuthenticate(options)

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = `Gatebox API error (${response.status}): ${errorText}`
    
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
 * Realiza saque PIX (Cash-Out)
 */
export async function gateboxWithdraw(
  options: GateboxClientOptions,
  payload: GateboxWithdrawPayload
): Promise<GateboxWithdrawResponse> {
  const baseUrl = options.baseUrl || 'https://api.gatebox.com.br'
  const url = `${baseUrl}/v1/customers/pix/withdraw`

  // Autenticar primeiro
  const token = await gateboxAuthenticate(options)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      externalId: payload.externalId,
      key: payload.key,
      name: payload.name,
      description: payload.description,
      amount: payload.amount,
      documentNumber: payload.documentNumber,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = `Gatebox API error (${response.status}): ${errorText}`
    
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
 * Limpa o cache de token (útil para testes ou quando credenciais mudam)
 */
export function gateboxClearTokenCache(): void {
  tokenCache = null
}
