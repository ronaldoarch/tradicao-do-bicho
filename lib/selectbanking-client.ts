/**
 * Cliente HTTP para Cash API (SelectBanking).
 * Contrato: https://api.selectbanking.com.br/docs/cash
 */

export interface SelectBankingConfig {
  baseUrl: string
  token: string
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '')
}

function parseJsonResponse(text: string, status: number, statusText: string): any {
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(text || statusText || String(status))
  }
}

export async function selectbankingCreateDeposit(
  config: SelectBankingConfig,
  params: {
    amountCents: number
    externalId: string
    postbackUrl: string
    payer: { name: string; email: string; document: string }
  }
): Promise<{ id: string; status?: string; qrCodeText: string; qrCodeImage?: string | null }> {
  const base = normalizeBaseUrl(config.baseUrl)
  const res = await fetch(`${base}/deposits/pix`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      amount: params.amountCents,
      method: 'pix',
      transactionOrigin: 'cashin',
      externalId: params.externalId,
      postbackUrl: params.postbackUrl,
      payer: {
        name: params.payer.name,
        email: params.payer.email,
        document: params.payer.document,
      },
    }),
  })

  const text = await res.text()
  const data = parseJsonResponse(text, res.status, res.statusText)

  if (!res.ok) {
    const msg = data?.message ?? data?.error ?? text
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }

  const deposit = data?.data ?? data
  const pix = deposit?.pix ?? data?.pix
  const qrCodeText = pix?.code ?? deposit?.pix?.code ?? ''
  const qrCodeImage = pix?.imageBase64 ?? deposit?.pix?.imageBase64 ?? null
  const id = String(deposit?.id ?? data?.id ?? '')
  if (!qrCodeText) {
    throw new Error('Resposta sem pix.code')
  }

  return {
    id,
    status: deposit?.status,
    qrCodeText,
    qrCodeImage: qrCodeImage || undefined,
  }
}

export async function selectbankingCreateWithdrawal(
  config: SelectBankingConfig,
  params: {
    amountCents: number
    externalId: string
    postbackUrl: string
    description: string
    recipient: {
      name: string
      document: string
      pixKeyType: 'document' | 'email' | 'phone_number' | 'aleatory'
      pixKey: string
    }
  }
): Promise<{ id: string }> {
  const base = normalizeBaseUrl(config.baseUrl)
  const res = await fetch(`${base}/withdrawals`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      amount: params.amountCents,
      type: 'pix',
      externalId: params.externalId,
      postbackUrl: params.postbackUrl,
      description: params.description,
      recipient: params.recipient,
    }),
  })

  const text = await res.text()
  const data = parseJsonResponse(text, res.status, res.statusText)

  if (!res.ok) {
    const msg = data?.message ?? data?.error ?? text
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }

  const w = data?.data ?? data
  const id = String(w?.id ?? data?.id ?? '')
  if (!id) {
    throw new Error('Resposta de saque sem id')
  }
  return { id }
}

/** Lista depósitos recentes e encontra por externalId (reconciliação). */
export async function selectbankingFindDepositStatusByExternalId(
  config: SelectBankingConfig,
  externalId: string
): Promise<{ status?: string; id?: string } | null> {
  const base = normalizeBaseUrl(config.baseUrl)
  const res = await fetch(`${base}/deposits?perPage=50&page=1`, {
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/json',
    },
  })
  const text = await res.text()
  if (!res.ok) return null
  const data = parseJsonResponse(text, res.status, res.statusText)
  const items: any[] = Array.isArray(data?.data) ? data.data : []
  const found = items.find((d) => d && String(d.externalId) === externalId)
  if (!found) return null
  return {
    id: found.id != null ? String(found.id) : undefined,
    status: found.status != null ? String(found.status).toLowerCase() : undefined,
  }
}
