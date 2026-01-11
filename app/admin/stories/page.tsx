'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Story {
  id: number
  title: string
  image: string
  active: boolean
  createdAt: string
}

export default function StoriesPage() {
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStories()
  }, [])

  const loadStories = async () => {
    try {
      const response = await fetch('/api/admin/stories')
      const data = await response.json()
      setStories(data.stories || [])
    } catch (error) {
      console.error('Erro ao carregar stories:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (id: number, active: boolean) => {
    try {
      await fetch('/api/admin/stories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: !active }),
      })
      loadStories()
    } catch (error) {
      console.error('Erro ao atualizar story:', error)
    }
  }

  const deleteStory = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar este story?')) return

    try {
      await fetch(`/api/admin/stories?id=${id}`, { method: 'DELETE' })
      loadStories()
    } catch (error) {
      console.error('Erro ao deletar story:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gerenciar Stories</h1>
        <Link
          href="/admin/stories/new"
          className="bg-blue text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Novo Story
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Imagem</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {stories.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  Nenhum story cadastrado
                </td>
              </tr>
            ) : (
              stories.map((story) => (
                <tr key={story.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{story.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{story.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {story.image ? '✅' : '❌'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleActive(story.id, story.active)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        story.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {story.active ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      href={`/admin/stories/${story.id}`}
                      className="text-blue hover:text-blue-700 mr-4"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => deleteStory(story.id)}
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
