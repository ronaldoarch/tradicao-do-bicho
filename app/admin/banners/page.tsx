'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Banner {
  id: number
  title: string
  badge: string
  highlight: string
  button: string
  bonus: string
  bonusBgClass: string
  active: boolean
  order: number
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBanners()
  }, [])

  const loadBanners = async () => {
    try {
      const response = await fetch('/api/admin/banners')
      const data = await response.json()
      setBanners(data.banners || [])
    } catch (error) {
      console.error('Erro ao carregar banners:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (id: number, active: boolean) => {
    try {
      await fetch('/api/admin/banners', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: !active }),
      })
      loadBanners()
    } catch (error) {
      console.error('Erro ao atualizar banner:', error)
    }
  }

  const deleteBanner = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar este banner?')) return

    try {
      await fetch(`/api/admin/banners?id=${id}`, { method: 'DELETE' })
      loadBanners()
    } catch (error) {
      console.error('Erro ao deletar banner:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gerenciar Banners</h1>
        <Link
          href="/admin/banners/new"
          className="bg-blue text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Novo Banner
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Badge</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destaque</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ordem</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {banners.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Nenhum banner cadastrado
                </td>
              </tr>
            ) : (
              banners.map((banner) => (
                <tr key={banner.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{banner.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{banner.badge}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{banner.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{banner.highlight}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{banner.order}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleActive(banner.id, banner.active)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        banner.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {banner.active ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      href={`/admin/banners/${banner.id}`}
                      className="text-blue hover:text-blue-700 mr-4"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => deleteBanner(banner.id)}
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
