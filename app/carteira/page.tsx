'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BottomNav from '@/components/BottomNav'
import DepositPixModal from '@/components/DepositPixModal'

interface UserInfo {
  nome: string
  email: string
  saldo: number
  saldoSacavel: number
  bonus: number
  bonusBloqueado: number
}

interface Transaction {
  id: string
  tipo: string
  data: string
  valor: number
  status: string
  pagoEm?: string
  descricao?: string
}

export default function CarteiraPage() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [depositValue, setDepositValue] = useState('')
  const [withdrawValue, setWithdrawValue] = useState('')
  const [withdrawChavePix, setWithdrawChavePix] = useState('')
  const [withdrawLoading, setWithdrawLoading] = useState(false)
  const [withdrawError, setWithdrawError] = useState<string | null>(null)
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null)
  const [depositError, setDepositError] = useState<string | null>(null)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(true)
  const [filtroTransacoes, setFiltroTransacoes] = useState<'todas' | 'depositos' | 'saques'>('todas')
  const [limites, setLimites] = useState({ saqueMinimo: 30, saqueMaximo: 10000, depositoMinimo: 25 })

  const loadLimites = async () => {
    try {
      const res = await fetch('/api/configuracoes')
      if (res.ok) {
        const data = await res.json()
        const c = data.configuracoes || {}
        const minSaque = c.limiteSaqueMinimo ?? 30
        const minDep = c.limiteDepositoMinimo ?? 25
        setLimites({
          saqueMinimo: minSaque,
          saqueMaximo: c.limiteSaqueMaximo ?? 10000,
          depositoMinimo: minDep,
        })
        setWithdrawValue(minSaque.toFixed(2).replace('.', ','))
        setDepositValue(minDep.toFixed(2).replace('.', ','))
      }
    } catch (e) {
      console.error('Erro ao carregar limites', e)
      setWithdrawValue('30,00')
      setDepositValue('25,00')
    }
  }

  const loadUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (data?.user) {
          setUser({
            nome: data.user.nome,
            email: data.user.email,
            saldo: data.user.saldo ?? 0,
            saldoSacavel: data.user.saldoSacavel ?? 0,
            bonus: data.user.bonus ?? 0,
            bonusBloqueado: data.user.bonusBloqueado ?? 0,
          })
        }
      }
    } catch (e) {
      console.error('Erro ao carregar usuário', e)
    }
  }

  const loadTransactions = async () => {
    setTransactionsLoading(true)
    try {
      const res = await fetch(`/api/transacoes?filtro=${filtroTransacoes}`)
      if (res.ok) {
        const data = await res.json()
        setTransactions(data.transacoes || [])
      }
    } catch (e) {
      console.error('Erro ao carregar transações', e)
    } finally {
      setTransactionsLoading(false)
    }
  }

  useEffect(() => {
    const load = async () => {
      await Promise.all([loadUser(), loadLimites()])
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    loadTransactions()
  }, [filtroTransacoes])

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="flex min-h-screen flex-col bg-gray-scale-100 text-[#1C1C1C]">
      <Header />

      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:py-8">
          <div className="flex items-center gap-2 text-sm text-blue">
            <a href="/" className="rounded-full bg-blue/5 px-3 py-1 font-semibold text-blue hover:bg-blue/10">
              Voltar
            </a>
          </div>

          <h1 className="text-2xl font-bold text-gray-950">Carteira</h1>

          {/* Resumo de saldos */}
          <section className="grid gap-6 rounded-xl bg-white p-6 shadow-sm md:grid-cols-2">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-lg font-bold text-gray-900">Saldo:</p>
                <p className="text-xl font-extrabold text-blue">{loading ? '--' : formatCurrency(user?.saldo || 0)}</p>
              </div>

              <div>
                <p className="text-lg font-bold text-gray-900">Disponível para saque:</p>
                <p className="text-xl font-extrabold text-green-600">{loading ? '--' : formatCurrency(user?.saldoSacavel ?? 0)}</p>
                <p className="mt-1 text-sm text-gray-600">Prêmios de apostas e bônus de indicação podem ser sacados via PIX.</p>
              </div>

              <div>
                <p className="text-lg font-bold text-gray-900">Bônus:</p>
                <p className="text-xl font-extrabold text-blue">
                  {loading ? '--' : formatCurrency(user?.bonus || 0)}
                </p>
              </div>

              <div>
                <p className="text-base font-semibold text-gray-900">Recompensa semanal:</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">0%</span>
                  <div className="h-2 w-full rounded-full bg-blue/10">
                    <div className="h-2 w-0 rounded-full bg-blue"></div>
                  </div>
                  <span className="text-lg">🎁</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <p className="text-lg font-bold text-gray-900">Bônus bloqueado:</p>
                <p className="text-xl font-extrabold text-blue">
                  {loading ? '--' : formatCurrency(user?.bonusBloqueado || 0)}
                </p>
                <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                  O bônus obtido inicialmente é bloqueado e será liberado gradualmente à medida que você utiliza seu
                  saldo em apostas, proporcionando mais oportunidades de ganhos!
                </p>
                <p className="text-sm text-gray-700">
                  Ex.: utiliza R$ 1,00 de saldo e libera R$ 1,00 de bônus.
                </p>
              </div>

            </div>
          </section>

          {/* Ações: Saque e Depósito */}
          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">Saque</h2>
              <p className="text-sm text-gray-700">Valor mínimo: R$ {limites.saqueMinimo.toFixed(2).replace('.', ',')}. Máximo: R$ {limites.saqueMaximo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Informe a chave PIX para receber.</p>

              {withdrawError && (
                <p className="mt-2 text-sm text-red-600" role="alert">{withdrawError}</p>
              )}
              {withdrawSuccess && (
                <p className="mt-2 text-sm text-green-600" role="status">{withdrawSuccess}</p>
              )}

              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 rounded-lg border-2 border-gray-200 px-3 py-2">
                  <span className="text-gray-700">R$</span>
                  <input
                    type="text"
                    value={withdrawValue}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '')
                      if (value === '') setWithdrawValue('0,00')
                      else setWithdrawValue((Number(value) / 100).toFixed(2).replace('.', ','))
                    }}
                    className="w-full border-none text-base outline-none"
                    aria-label="Valor do saque"
                  />
                </div>

                <div className="flex items-center gap-2 rounded-lg border-2 border-gray-200 px-3 py-2">
                  <span className="text-gray-700 shrink-0">Chave PIX</span>
                  <input
                    type="text"
                    value={withdrawChavePix}
                    onChange={(e) => setWithdrawChavePix(e.target.value)}
                    placeholder="CPF, e-mail, telefone ou chave aleatória"
                    className="w-full border-none text-base outline-none"
                    aria-label="Chave PIX"
                  />
                </div>

                <button
                  onClick={async () => {
                    setWithdrawError(null)
                    setWithdrawSuccess(null)
                    const valor = parseFloat(withdrawValue.replace(',', '.'))
                    if (valor < limites.saqueMinimo) {
                      setWithdrawError(`Valor mínimo para saque é R$ ${limites.saqueMinimo.toFixed(2).replace('.', ',')}.`)
                      return
                    }
                    if (valor > limites.saqueMaximo) {
                      setWithdrawError(`Valor máximo para saque é R$ ${limites.saqueMaximo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`)
                      return
                    }
                    if (!withdrawChavePix.trim()) {
                      setWithdrawError('Informe a chave PIX para receber o saque.')
                      return
                    }
                    setWithdrawLoading(true)
                    try {
                      const res = await fetch('/api/saques', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ valor, chavePix: withdrawChavePix.trim() }),
                      })
                      const data = await res.json()
                      if (!res.ok) {
                        setWithdrawError(data.error || 'Erro ao solicitar saque.')
                        return
                      }
                      setWithdrawSuccess(data.message || 'Saque enviado! O PIX será processado em instantes.')
                      setWithdrawValue(limites.saqueMinimo.toFixed(2).replace('.', ','))
                      setWithdrawChavePix('')
                      loadUser()
                      loadTransactions()
                    } catch {
                      setWithdrawError('Erro de conexão. Tente novamente.')
                    } finally {
                      setWithdrawLoading(false)
                    }
                  }}
                  disabled={withdrawLoading}
                  className="w-full rounded-lg bg-blue px-4 py-3 text-center font-semibold text-white hover:bg-blue-scale-70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {withdrawLoading ? 'Enviando...' : 'Efetuar saque'}
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">Depósito</h2>
              <p className="text-sm text-gray-700">
                Valor mínimo: R$ {limites.depositoMinimo.toFixed(2).replace('.', ',')}. O depósito deve ser feito usando uma conta onde o CPF deve ser o mesmo da conta registrada na plataforma.
              </p>

              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 rounded-lg border-2 border-gray-200 px-3 py-2">
                  <span className="text-gray-700">R$</span>
                  <input
                    type="text"
                    value={depositValue}
                    onChange={(e) => {
                      // Formatar como moeda brasileira
                      const value = e.target.value.replace(/\D/g, '')
                      if (value === '') {
                        setDepositValue('0,00')
                      } else {
                        const formatted = (Number(value) / 100).toFixed(2).replace('.', ',')
                        setDepositValue(formatted)
                      }
                    }}
                    className="w-full border-none text-base outline-none"
                    aria-label="Valor do depósito"
                    placeholder="0,00"
                  />
                </div>

                {depositError && <p className="text-sm text-red-600">{depositError}</p>}
                <button
                  onClick={() => {
                    setDepositError(null)
                    const valor = parseFloat(depositValue.replace(',', '.'))
                    if (valor <= 0) return
                    if (valor < limites.depositoMinimo) {
                      setDepositError(`Valor mínimo para depósito é R$ ${limites.depositoMinimo.toFixed(2).replace('.', ',')}.`)
                      return
                    }
                    setShowDepositModal(true)
                  }}
                  disabled={parseFloat(depositValue.replace(',', '.')) <= 0}
                  className="w-full rounded-lg bg-yellow px-4 py-3 text-center font-bold text-blue-950 hover:bg-yellow/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Efetuar depósito
                </button>
              </div>
            </div>
          </section>

          {/* Transações */}
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Minhas transações</h2>
                <p className="text-sm text-gray-700">Acompanhe o seu histórico de depósitos e saques.</p>
              </div>
              <button
                onClick={() => loadTransactions()}
                disabled={transactionsLoading}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Atualizar
              </button>
            </div>

            <div className="mt-4 flex items-center gap-4 text-blue font-semibold">
              <button
                onClick={() => setFiltroTransacoes('todas')}
                className={`pb-1 ${filtroTransacoes === 'todas' ? 'border-b-2 border-blue' : 'hover:text-blue/80'}`}
              >
                Todas
              </button>
              <button
                onClick={() => setFiltroTransacoes('depositos')}
                className={`pb-1 ${filtroTransacoes === 'depositos' ? 'border-b-2 border-blue' : 'hover:text-blue/80'}`}
              >
                Depósitos
              </button>
              <button
                onClick={() => setFiltroTransacoes('saques')}
                className={`pb-1 ${filtroTransacoes === 'saques' ? 'border-b-2 border-blue' : 'hover:text-blue/80'}`}
              >
                Saques
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Transação</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Data</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Valor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Pago</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactionsLoading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue border-t-transparent" />
                        <p className="mt-2 text-sm text-gray-500">Carregando transações...</p>
                      </td>
                    </tr>
                  )}
                  {!transactionsLoading && transactions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-sm text-gray-500 text-center">
                        Nenhuma transação encontrada.
                      </td>
                    </tr>
                  )}

                  {!transactionsLoading && transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{t.tipo}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(t.data).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className={`px-4 py-3 text-sm font-medium ${t.valor >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {t.valor >= 0 ? '+' : ''}{formatCurrency(t.valor)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{t.status}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {t.pagoEm
                          ? new Date(t.pagoEm).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      <Footer />
      <BottomNav />

      <DepositPixModal
        isOpen={showDepositModal}
        valor={parseFloat(depositValue.replace(',', '.'))}
        onClose={() => setShowDepositModal(false)}
      />
    </div>
  )
}
