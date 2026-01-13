const DEFAULT_BASE_URL = process.env.RECEBA_BASE_URL ?? 'https://sandbox.receba.online'

export interface RecebaClientOptions {
  baseUrl?: string
  apiKey?: string
}

async function request<T = any>(path: string, options: RecebaClientOptions, init?: RequestInit): Promise<T> {
  const url = `${options.baseUrl ?? DEFAULT_BASE_URL}${path}`
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.apiKey ?? process.env.RECEBA_API_KEY ?? ''}`,
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '')
    throw new Error(`Receba API error ${res.status}: ${errorBody}`)
  }

  return (await res.json()) as T
}

// Exemplos de endpoints básicos, ajustáveis conforme a documentação oficial
export async function recebaListTransactions(options: RecebaClientOptions = {}) {
  return request('/transactions', options)
}

export async function recebaCreatePix(options: RecebaClientOptions = {}, payload: any) {
  return request('/pix', options, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function recebaWebhookPing(options: RecebaClientOptions = {}) {
  return request('/status', options)
}
