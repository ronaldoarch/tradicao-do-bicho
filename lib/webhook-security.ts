import crypto from 'crypto'
import type { NextRequest } from 'next/server'

export type WebhookSource = 'selectbanking'

export function getWebhookSecret(source: WebhookSource): string | undefined {
  if (source === 'selectbanking') {
    return process.env.SELECTBANKING_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET || undefined
  }
  return process.env.WEBHOOK_SECRET || undefined
}

export function appendWebhookSecret(url: string, secret: string | undefined): string {
  if (!secret) return url
  const u = new URL(url)
  u.searchParams.set('secret', secret)
  return u.toString()
}

function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'hex')
    const bb = Buffer.from(b, 'hex')
    if (ba.length !== bb.length) return false
    return crypto.timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}

function hmacSha256Valid(secret: string, body: string, signatureHeader: string): boolean {
  const expectedHex = crypto.createHmac('sha256', secret).update(body).digest('hex')
  let sig = signatureHeader.trim().replace(/^sha256=/i, '').trim()
  if (timingSafeEqualHex(sig, expectedHex)) return true
  try {
    const sigBuf = Buffer.from(sig, 'base64')
    const expBuf = Buffer.from(expectedHex, 'hex')
    if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) return true
  } catch {
    /* ignore */
  }
  return false
}

/**
 * Valida webhook: query ?secret=, header x-webhook-secret, Authorization Bearer, ou HMAC.
 * Em produção sem segredo configurado → recusa (500), conforme política do projeto.
 */
export function verifyWebhookRequest(
  req: NextRequest,
  rawBody: string,
  source: WebhookSource
): { ok: true } | { ok: false; status: number; message: string } {
  const secret = getWebhookSecret(source)
  const isProd = process.env.NODE_ENV === 'production'

  if (!secret || secret.length === 0) {
    if (isProd) {
      return { ok: false, status: 500, message: 'Webhook secret não configurado' }
    }
    console.warn('[webhook-security] SELECTBANKING_WEBHOOK_SECRET / WEBHOOK_SECRET ausente — permitindo em desenvolvimento')
    return { ok: true }
  }

  const url = new URL(req.url)
  const qs = url.searchParams.get('secret')
  if (qs && qs === secret) return { ok: true }

  const xSecret = req.headers.get('x-webhook-secret')
  if (xSecret && xSecret === secret) return { ok: true }

  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ') && auth.slice(7) === secret) return { ok: true }

  const sig =
    req.headers.get('x-webhook-signature') || req.headers.get('x-hub-signature-256')
  if (sig && rawBody.length > 0 && hmacSha256Valid(secret, rawBody, sig)) {
    return { ok: true }
  }

  return { ok: false, status: 401, message: 'Webhook não autorizado' }
}
