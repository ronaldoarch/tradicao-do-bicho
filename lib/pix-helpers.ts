/**
 * Normaliza chave PIX quando for telefone celular.
 * A Gatebox exige formato E.164: +55XX9XXXXXXXX (Brasil).
 */
export function normalizePixKey(key: string): string {
  const trimmed = key.trim()
  const digitsOnly = trimmed.replace(/\D/g, '')

  // Email: não alterar
  if (trimmed.includes('@')) {
    return trimmed
  }

  // Chave aleatória (UUID): não alterar
  if (/^[0-9a-f-]{36}$/i.test(trimmed) || (trimmed.length > 30 && trimmed.includes('-'))) {
    return trimmed
  }

  // Já tem +55 ou 55 na frente (formato E.164)
  if (trimmed.startsWith('+55') || (digitsOnly.startsWith('55') && digitsOnly.length >= 12)) {
    return trimmed.startsWith('+') ? trimmed : `+${digitsOnly}`
  }

  // Telefone celular: 11 dígitos, 3º dígito = 9 (9XXXXXXXX)
  if (digitsOnly.length === 11 && digitsOnly[2] === '9') {
    return `+55${digitsOnly}`
  }

  // Telefone antigo: 10 dígitos (DDD + 8 dígitos)
  if (digitsOnly.length === 10) {
    return `+55${digitsOnly}`
  }

  // CPF como chave: 11 dígitos, enviar sem pontuação (doc Gatebox: "sem pontuação")
  if (digitsOnly.length === 11 && digitsOnly[2] !== '9') {
    return digitsOnly
  }

  // CNPJ como chave: 14 dígitos
  if (digitsOnly.length === 14) {
    return digitsOnly
  }

  return trimmed
}

/**
 * Sanitiza CPF/CNPJ para envio à Gatebox (apenas dígitos).
 * A documentação exige "sem pontuação".
 */
export function sanitizeDocumentNumber(doc: string | null | undefined): string | undefined {
  if (!doc || typeof doc !== 'string') return undefined
  const digits = doc.replace(/\D/g, '')
  if (digits.length === 11 || digits.length === 14) return digits
  return undefined
}

/** Tipos de chave PIX esperados pela Cash API (SelectBanking). */
export function inferSelectBankingPixKeyType(key: string): 'document' | 'email' | 'phone_number' | 'aleatory' {
  const t = key.trim()
  if (t.includes('@')) return 'email'

  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) {
    return 'aleatory'
  }

  const digitsOnly = t.replace(/\D/g, '')

  if (digitsOnly.length === 11 && digitsOnly[2] !== '9') {
    return 'document'
  }
  if (digitsOnly.length === 14) {
    return 'document'
  }
  if (digitsOnly.length >= 10) {
    return 'phone_number'
  }

  if (t.length > 20) {
    return 'aleatory'
  }

  return 'aleatory'
}
