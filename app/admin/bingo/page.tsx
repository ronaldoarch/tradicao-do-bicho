'use client'

import { useState, useEffect } from 'react'

interface SalaBingo {
  id: number
  nome: string
  descricao: string | null
  valorCartela: number
  premioTotal: number
  premioLinha: number
  premioColuna: number
  premioDiagonal: number
  premioBingo: number
  ativa: boolean
  emAndamento: boolean
  dataInicio: string | null
  dataFim: string | null
  numerosSorteados: number[] | null
  resultadoFinal: any
  _count?: {
    cartelas: number
    resultados: number
  }
}

export default function BingoAdminPage() {
  const [salas, setSalas] = useState<SalaBingo[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [salaSelecionada, setSalaSelecionada] = useState<SalaBingo | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    valorCartela: '',
    premioTotal: '',
    premioLinha: '',
    premioColuna: '',
    premioDiagonal: '',
    premioBingo: '',
    ativa: true,
  })

  useEffect(() => {
    carregarSalas()
  }, [])

  const carregarSalas = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/bingo/salas')
      const data = await res.json()
      setSalas(data.salas || [])
    } catch (error) {
      console.error('Erro ao carregar salas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSalvar = async () => {
    if (!formData.nome || !formData.valorCartela) {
      alert('Preencha nome e valor da cartela')
      return
    }

    setLoading(true)
    try {
      const url = salaSelecionada ? '/api/admin/bingo/salas' : '/api/admin/bingo/salas'
      const method = salaSelecionada ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(salaSelecionada && { id: salaSelecionada.id }),
          ...formData,
        }),
      })

      if (res.ok) {
        setShowForm(false)
        setSalaSelecionada(null)
        setFormData({
          nome: '',
          descricao: '',
          valorCartela: '',
          premioTotal: '',
          premioLinha: '',
          premioColuna: '',
          premioDiagonal: '',
          premioBingo: '',
          ativa: true,
        })
        carregarSalas()
      } else {
        const error = await res.json()
        alert(error.error || 'Erro ao salvar sala')
      }
    } catch (error) {
      console.error('Erro ao salvar sala:', error)
      alert('Erro ao salvar sala')
    } finally {
      setLoading(false)
    }
  }

  const handleEditar = (sala: SalaBingo) => {
    setSalaSelecionada(sala)
    setFormData({
      nome: sala.nome,
      descricao: sala.descricao || '',
      valorCartela: sala.valorCartela.toString(),
      premioTotal: sala.premioTotal.toString(),
      premioLinha: sala.premioLinha.toString(),
      premioColuna: sala.premioColuna.toString(),
      premioDiagonal: sala.premioDiagonal.toString(),
      premioBingo: sala.premioBingo.toString(),
      ativa: sala.ativa,
    })
    setShowForm(true)
  }

  const handleIniciar = async (salaId: number) => {
    if (!confirm('Tem certeza que deseja iniciar esta sala de bingo?')) return

    setLoading(true)
    try {
      const res = await fetch('/api/admin/bingo/sortear', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salaId, iniciar: true }),
      })

      if (res.ok) {
        carregarSalas()
      } else {
        alert('Erro ao iniciar sala')
      }
    } catch (error) {
      console.error('Erro ao iniciar sala:', error)
      alert('Erro ao iniciar sala')
    } finally {
      setLoading(false)
    }
  }

  const handleSortear = async (salaId: number) => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/bingo/sortear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salaId }),
      })

      if (res.ok) {
        const data = await res.json()
        alert(`Número sorteado: ${data.numero}\nTotal sorteados: ${data.totalSorteados}`)
        carregarSalas()
      } else {
        alert('Erro ao sortear número')
      }
    } catch (error) {
      console.error('Erro ao sortear número:', error)
      alert('Erro ao sortear número')
    } finally {
      setLoading(false)
    }
  }

  const handleFinalizar = async (salaId: number) => {
    if (!confirm('Tem certeza que deseja finalizar esta sala de bingo?')) return

    setLoading(true)
    try {
      const res = await fetch('/api/admin/bingo/finalizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salaId }),
      })

      if (res.ok) {
        const data = await res.json()
        alert(`Sala finalizada!\nGanhadores: ${JSON.stringify(data.ganhadores, null, 2)}`)
        carregarSalas()
      } else {
        alert('Erro ao finalizar sala')
      }
    } catch (error) {
      console.error('Erro ao finalizar sala:', error)
      alert('Erro ao finalizar sala')
    } finally {
      setLoading(false)
    }
  }

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gerenciar Salas de Bingo</h1>
        <p className="text-gray-600 mt-2">Crie e gerencie salas de bingo com sorteio de números</p>
      </div>

      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Salas de Bingo</h2>
        <button
          onClick={() => {
            setShowForm(!showForm)
            setSalaSelecionada(null)
            setFormData({
              nome: '',
              descricao: '',
              valorCartela: '',
              premioTotal: '',
              premioLinha: '',
              premioColuna: '',
              premioDiagonal: '',
              premioBingo: '',
              ativa: true,
            })
          }}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-md flex items-center gap-2 transition-all hover:shadow-lg"
        >
          <span className="text-xl">+</span>
          <span>{showForm ? 'Cancelar' : 'Nova Sala'}</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {salaSelecionada ? 'Editar Sala' : 'Nova Sala'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valor da Cartela (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.valorCartela}
                onChange={(e) => setFormData({ ...formData, valorCartela: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prêmio Linha (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.premioLinha}
                onChange={(e) => setFormData({ ...formData, premioLinha: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prêmio Coluna (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.premioColuna}
                onChange={(e) => setFormData({ ...formData, premioColuna: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prêmio Diagonal (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.premioDiagonal}
                onChange={(e) => setFormData({ ...formData, premioDiagonal: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prêmio Bingo (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.premioBingo}
                onChange={(e) => setFormData({ ...formData, premioBingo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.ativa}
                  onChange={(e) => setFormData({ ...formData, ativa: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">Sala Ativa</span>
              </label>
            </div>
            <div className="md:col-span-2">
              <button
                onClick={handleSalvar}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && <div className="text-center py-8">Carregando...</div>}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Nome
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Valor Cartela
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Cartelas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {salas.map((sala) => (
              <tr key={sala.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{sala.nome}</div>
                  {sala.descricao && (
                    <div className="text-xs text-gray-500">{sala.descricao}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatarMoeda(sala.valorCartela)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {sala._count?.cartelas || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      sala.emAndamento
                        ? 'bg-yellow-100 text-yellow-800'
                        : sala.ativa
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {sala.emAndamento ? 'Em Andamento' : sala.ativa ? 'Ativa' : 'Inativa'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => handleEditar(sala)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Editar
                  </button>
                  {!sala.emAndamento && sala.ativa && (
                    <button
                      onClick={() => handleIniciar(sala.id)}
                      className="text-green-600 hover:text-green-900"
                    >
                      Iniciar
                    </button>
                  )}
                  {sala.emAndamento && (
                    <>
                      <button
                        onClick={() => handleSortear(sala.id)}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        Sortear
                      </button>
                      <button
                        onClick={() => handleFinalizar(sala.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Finalizar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {salas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  Nenhuma sala cadastrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
