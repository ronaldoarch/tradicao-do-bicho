'use client'

import { useEffect, useState } from 'react'

interface Extracao {
  id: number
  name: string
  active: boolean
  time: string
}

export default function ExtracoesPage() {
  const [extracoes, setExtracoes] = useState<Extracao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadExtracoes()
  }, [])

  const loadExtracoes = async () => {
    try {
      const response = await fetch('/api/admin/extracoes')
      const data = await response.json()
      setExtracoes(data.extracoes || [])
    } catch (error) {
      console.error('Erro ao carregar extrações:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (id: number, active: boolean) => {
    try {
      await fetch('/api/admin/extracoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: !active }),
      })
      loadExtracoes()
    } catch (error) {
      console.error('Erro ao atualizar extração:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Gerenciar Extrações</h1>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horário</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {extracoes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  Nenhuma extração cadastrada
                </td>
              </tr>
            ) : (
              extracoes.map((extracao) => (
                <tr key={extracao.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{extracao.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{extracao.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{extracao.time}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleActive(extracao.id, extracao.active)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        extracao.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {extracao.active ? 'Ativa' : 'Inativa'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => toggleActive(extracao.id, extracao.active)}
                      className="text-blue hover:text-blue-700"
                    >
                      {extracao.active ? 'Desativar' : 'Ativar'}
                    </button>
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
