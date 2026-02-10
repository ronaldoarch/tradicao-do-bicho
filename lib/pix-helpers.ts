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

  // CPF, CNPJ ou outro: não alterar
  return trimmed
}
