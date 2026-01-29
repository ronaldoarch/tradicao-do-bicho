'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Cotada {
  id: number
  numero: string
  modalidade: string
  cotacao: number
  ativo: boolean
  createdAt: string
  updatedAt: string
}

export default function CotadasPage() {
  const router = useRouter()
  const [cotadas, setCotadas] = useState<Cotada[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Cotada | null>(null)
  const [formData, setFormData] = useState({
    numero: '',
    modalidade: 'MILHAR' as 'MILHAR' | 'CENTENA',
    cotacao: '',
    ativo: true,
  })
  const [filterModalidade, setFilterModalidade] = useState<'MILHAR' | 'CENTENA' | ''>('')

  useEffect(() => {
    loadCotadas()
  }, [filterModalidade])

  const loadCotadas = async () => {
    try {
      setLoading(true)
      const url = filterModalidade 
        ? `/api/admin/cotadas?modalidade=${filterModalidade}`
        : '/api/admin/cotadas'
      const res = await fetch(url, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setCotadas(data.cotadas || [])
      }
    } catch (error) {
      console.error('Erro ao carregar cotadas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/admin/cotadas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          cotacao: Number(formData.cotacao),
        }),
      })

      if (res.ok) {
        await loadCotadas()
        setShowForm(false)
        setEditing(null)
        setFormData({ numero: '', modalidade: 'MILHAR', cotacao: '', ativo: true })
      } else {
        const error = await res.json()
        alert(`Erro: ${error.error}`)
      }
    } catch (error) {
      console.error('Erro ao salvar cotada:', error)
      alert('Erro ao salvar cotada')
    }
  }

  const handleEdit = (cotada: Cotada) => {
    setEditing(cotada)
    setFormData({
      numero: cotada.numero,
      modalidade: cotada.modalidade as 'MILHAR' | 'CENTENA',
      cotacao: cotada.cotacao.toString(),
      ativo: cotada.ativo,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja realmente desativar esta cotada?')) return

    try {
      const res = await fetch(`/api/admin/cotadas?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (res.ok) {
        await loadCotadas()
      } else {
        alert('Erro ao desativar cotada')
      }
    } catch (error) {
      console.error('Erro ao deletar cotada:', error)
      alert('Erro ao desativar cotada')
    }
  }

  const handleToggleActive = async (id: number, ativo: boolean) => {
    try {
      const res = await fetch(`/api/admin/cotadas?id=${id}&action=${ativo ? 'deactivate' : 'activate'}`, {
        method: 'PATCH',
        credentials: 'include',
      })

      if (res.ok) {
        await loadCotadas()
      } else {
        alert('Erro ao atualizar cotada')
      }
    } catch (error) {
      console.error('Erro ao atualizar cotada:', error)
      alert('Erro ao atualizar cotada')
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gerenciar Cotadas</h1>
        <button
          onClick={() => {
            setShowForm(!showForm)
            setEditing(null)
            setFormData({ numero: '', modalidade: 'MILHAR', cotacao: '', ativo: true })
          }}
          className="rounded bg-blue px-4 py-2 text-white hover:bg-blue-700"
        >
          {showForm ? 'Cancelar' : 'Nova Cotada'}
        </button>
      </div>

      {/* Filtro */}
      <div className="mb-4">
        <label className="mr-2">Filtrar por modalidade:</label>
        <select
          value={filterModalidade}
          onChange={(e) => setFilterModalidade(e.target.value as 'MILHAR' | 'CENTENA' | '')}
          className="rounded border px-3 py-1"
        >
          <option value="">Todas</option>
          <option value="MILHAR">Milhar</option>
          <option value="CENTENA">Centena</option>
        </select>
      </div>

      {/* Formulário */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded border bg-white p-4">
          <h2 className="mb-4 text-xl font-semibold">
            {editing ? 'Editar Cotada' : 'Nova Cotada'}
          </h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium">Número</label>
            <input
              type="text"
              value={formData.numero}
              onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
              placeholder={formData.modalidade === 'MILHAR' ? '0000-9999' : '000-999'}
              className="mt-1 w-full rounded border px-3 py-2"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium">Modalidade</label>
            <select
              value={formData.modalidade}
              onChange={(e) => setFormData({ ...formData, modalidade: e.target.value as 'MILHAR' | 'CENTENA' })}
              className="mt-1 w-full rounded border px-3 py-2"
            >
              <option value="MILHAR">Milhar</option>
              <option value="CENTENA">Centena</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium">Cotação (Multiplicador)</label>
            <input
              type="number"
              step="0.01"
              value={formData.cotacao}
              onChange={(e) => setFormData({ ...formData, cotacao: e.target.value })}
              placeholder="Ex: 833.33 (para milhar cotada)"
              className="mt-1 w-full rounded border px-3 py-2"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Multiplicador personalizado. Ex: Se milhar normal é 5000x, cotada pode ser 833.33x (5000 ÷ 6)
            </p>
          </div>

          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.ativo}
                onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                className="mr-2"
              />
              Ativo
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded bg-green px-4 py-2 text-white hover:bg-green-700"
            >
              {editing ? 'Atualizar' : 'Salvar'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditing(null)
                setFormData({ numero: '', modalidade: 'MILHAR', cotacao: '', ativo: true })
              }}
              className="rounded bg-gray-300 px-4 py-2 hover:bg-gray-400"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista */}
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">ID</th>
                <th className="border p-2 text-left">Número</th>
                <th className="border p-2 text-left">Modalidade</th>
                <th className="border p-2 text-left">Cotação</th>
                <th className="border p-2 text-left">Status</th>
                <th className="border p-2 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {cotadas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="border p-4 text-center text-gray-500">
                    Nenhuma cotada cadastrada
                  </td>
                </tr>
              ) : (
                cotadas.map((cotada) => (
                  <tr key={cotada.id}>
                    <td className="border p-2">{cotada.id}</td>
                    <td className="border p-2 font-mono">{cotada.numero}</td>
                    <td className="border p-2">{cotada.modalidade}</td>
                    <td className="border p-2">{cotada.cotacao}x</td>
                    <td className="border p-2">
                      <span className={cotada.ativo ? 'text-green-600' : 'text-red-600'}>
                        {cotada.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="border p-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(cotada)}
                          className="rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleActive(cotada.id, cotada.ativo)}
                          className={`rounded px-2 py-1 text-xs text-white ${
                            cotada.ativo
                              ? 'bg-yellow-500 hover:bg-yellow-600'
                              : 'bg-green-500 hover:bg-green-600'
                          }`}
                        >
                          {cotada.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          onClick={() => handleDelete(cotada.id)}
                          className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
