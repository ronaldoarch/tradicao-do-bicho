'use client'

import { useEffect, useState } from 'react'

interface Saque {
  id: number
  usuario: string
  valor: number
  status: 'pendente' | 'processando' | 'aprovado' | 'rejeitado'
  data: string
}

export default function SaquesPage() {
  const [saques, setSaques] = useState<Saque[]>([])
  const [limiteSaque, setLimiteSaque] = useState({ minimo: 30, maximo: 10000 })
  const [limiteDepositoMinimo, setLimiteDepositoMinimo] = useState(25)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const response = await fetch('/api/admin/saques')
      const data = await response.json()
      setSaques(data.saques || [])
      setLimiteSaque(data.limiteSaque || { minimo: 30, maximo: 10000 })
      setLimiteDepositoMinimo(data.limiteDepositoMinimo ?? 25)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSaqueStatus = async (id: number, status: string) => {
    try {
      await fetch('/api/admin/saques', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      loadData()
    } catch (error) {
      console.error('Erro ao atualizar saque:', error)
    }
  }

  const updateLimite = async () => {
    try {
      await fetch('/api/admin/saques', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limiteSaque, limiteDepositoMinimo }),
      })
      alert('Limites atualizados com sucesso!')
    } catch (error) {
      console.error('Erro ao atualizar limites:', error)
      alert('Erro ao atualizar limites')
    }
  }

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Gerenciar Saques</h1>

      {/* Limites de Saque e Depósito */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Limites de Saque e Depósito</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Saque mínimo (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={limiteSaque.minimo}
              onChange={(e) => setLimiteSaque({ ...limiteSaque, minimo: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Saque máximo (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={limiteSaque.maximo}
              onChange={(e) => setLimiteSaque({ ...limiteSaque, maximo: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Depósito mínimo (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={limiteDepositoMinimo}
              onChange={(e) => setLimiteDepositoMinimo(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
        <button
          onClick={updateLimite}
          className="bg-blue text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Salvar Limites
        </button>
      </div>

      {/* Lista de Saques */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuário</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {saques.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  Nenhum saque pendente
                </td>
              </tr>
            ) : (
              saques.map((saque) => (
                <tr key={saque.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{saque.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{saque.usuario}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">R$ {saque.valor.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        saque.status === 'aprovado'
                          ? 'bg-green-100 text-green-800'
                          : saque.status === 'rejeitado'
                          ? 'bg-red-100 text-red-800'
                          : saque.status === 'processando'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {saque.status === 'pendente'
                        ? 'Pendente'
                        : saque.status === 'processando'
                        ? 'Processando'
                        : saque.status === 'aprovado'
                        ? 'Aprovado'
                        : 'Rejeitado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{saque.data}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {saque.status === 'pendente' && (
                      <>
                        <button
                          onClick={() => updateSaqueStatus(saque.id, 'aprovado')}
                          className="text-green-600 hover:text-green-800 mr-4"
                        >
                          Aprovar
                        </button>
                        <button
                          onClick={() => updateSaqueStatus(saque.id, 'rejeitado')}
                          className="text-red-600 hover:text-red-800"
                        >
                          Rejeitar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
