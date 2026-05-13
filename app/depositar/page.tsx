import { redirect } from 'next/navigation'

/**
 * Rota legada usada em links (perfil, modal). O fluxo de depósito fica em /carteira + modal PIX.
 * redirect() garante compatibilidade mesmo se redirects do next.config não forem aplicados no host.
 */
export default function DepositarPage() {
  redirect('/carteira?deposito=1')
}
