'use client'

import { useState } from 'react'

interface AddSaldoModalProps {
  isOpen: boolean
  usuario: { id: number; nome: string; email: string; saldo: number } | null
  onClose: () => void
  onSuccess: () => void
}

export default function AddSaldoModal({ isOpen, usuario, onClose, onSuccess }: AddSaldoModalProps) {
  const [valor, setValor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !usuario) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const valorNum = parseFloat(valor)
    if (isNaN(valorNum) || valorNum <= 0) {
      setError('Valor inválido. Digite um valor maior que zero.')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/admin/usuarios/${usuario.id}/saldo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          valor: valorNum,
          descricao: descricao || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao adicionar saldo')
      }

      // Limpar formulário
      setValor('')
      setDescricao('')
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar saldo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Adicionar Saldo</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 transition-colors"
            aria-label="Fechar"
          >
            <span className="iconify text-xl" data-icon="material-symbols:close"></span>
          </button>
        </div>

        <div className="mb-4 rounded-lg bg-gray-50 p-3">
          <p className="text-sm text-gray-600">Usuário</p>
          <p className="font-semibold text-gray-900">{usuario.nome}</p>
          <p className="text-sm text-gray-600">{usuario.email}</p>
          <p className="mt-2 text-sm text-gray-600">
            Saldo atual: <span className="font-bold text-blue">R$ {usuario.saldo.toFixed(2)}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="valor" className="mb-2 block text-sm font-semibold text-gray-700">
              Valor (R$)
            </label>
            <input
              id="valor"
              type="number"
              step="0.01"
              min="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              required
              className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-lg font-semibold focus:border-blue focus:outline-none"
              placeholder="0.00"
            />
          </div>

          <div>
            <label htmlFor="descricao" className="mb-2 block text-sm font-semibold text-gray-700">
              Descrição (opcional)
            </label>
            <input
              id="descricao"
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:border-blue focus:outline-none"
              placeholder="Ex: Depósito manual via admin"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border-2 border-red-200 p-3">
              <p className="text-sm font-semibold text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border-2 border-gray-300 bg-white px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-blue px-4 py-3 font-bold text-white hover:bg-blue-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Adicionando...' : 'Adicionar Saldo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
