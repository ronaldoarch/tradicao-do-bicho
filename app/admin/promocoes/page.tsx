'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Promocao {
  id: number
  title: string
  description: string
  bonus: string
  active: boolean
  createdAt: string
}

export default function PromocoesPage() {
  const [promocoes, setPromocoes] = useState<Promocao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPromocoes()
  }, [])

  const loadPromocoes = async () => {
    try {
      const response = await fetch('/api/admin/promocoes')
      const data = await response.json()
      setPromocoes(data.promocoes || [])
    } catch (error) {
      console.error('Erro ao carregar promoções:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (id: number, active: boolean) => {
    try {
      await fetch('/api/admin/promocoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: !active }),
      })
      loadPromocoes()
    } catch (error) {
      console.error('Erro ao atualizar promoção:', error)
    }
  }

  const deletePromocao = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar esta promoção?')) return

    try {
      await fetch(`/api/admin/promocoes?id=${id}`, { method: 'DELETE' })
      loadPromocoes()
    } catch (error) {
      console.error('Erro ao deletar promoção:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gerenciar Promoções</h1>
        <Link
          href="/admin/promocoes/new"
          className="bg-blue text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Nova Promoção
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bônus</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {promocoes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  Nenhuma promoção cadastrada
                </td>
              </tr>
            ) : (
              promocoes.map((promocao) => (
                <tr key={promocao.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{promocao.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{promocao.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{promocao.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{promocao.bonus}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleActive(promocao.id, promocao.active)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        promocao.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {promocao.active ? 'Ativa' : 'Inativa'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      href={`/admin/promocoes/${promocao.id}`}
                      className="text-blue hover:text-blue-700 mr-4"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => deletePromocao(promocao.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Deletar
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
