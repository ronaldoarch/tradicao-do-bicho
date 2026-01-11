'use client'

import { useEffect, useState } from 'react'

interface Modality {
  id: number
  name: string
  value: string
  hasLink: boolean
  active?: boolean
}

export default function ModalidadesPage() {
  const [modalidades, setModalidades] = useState<Modality[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadModalidades()
  }, [])

  const loadModalidades = async () => {
    try {
      const response = await fetch('/api/admin/modalidades')
      const data = await response.json()
      setModalidades(data.modalidades || [])
    } catch (error) {
      console.error('Erro ao carregar modalidades:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (id: number, active: boolean) => {
    try {
      await fetch('/api/admin/modalidades', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: !active }),
      })
      loadModalidades()
    } catch (error) {
      console.error('Erro ao atualizar modalidade:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Gerenciar Modalidades</h1>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Link Especial</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {modalidades.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  Nenhuma modalidade cadastrada
                </td>
              </tr>
            ) : (
              modalidades.map((modalidade) => (
                <tr key={modalidade.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{modalidade.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{modalidade.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{modalidade.value}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {modalidade.hasLink ? '✅ Sim' : '❌ Não'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleActive(modalidade.id, modalidade.active || true)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        modalidade.active !== false
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {modalidade.active !== false ? 'Ativa' : 'Inativa'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => toggleActive(modalidade.id, modalidade.active || true)}
                      className="text-blue hover:text-blue-700"
                    >
                      {modalidade.active !== false ? 'Desativar' : 'Ativar'}
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
