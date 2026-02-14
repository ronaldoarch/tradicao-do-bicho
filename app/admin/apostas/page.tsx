'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ANIMALS } from '@/data/animals'

interface Aposta {
  id: number
  usuarioId: number
  concurso: string | null
  loteria: string | null
  estado: string | null
  horario: string | null
  dataConcurso: Date | null
  modalidade: string | null
  aposta: string | null
  valor: number
  retornoPrevisto: number
  status: string
  detalhes: any
  createdAt: Date
  updatedAt: Date
  usuario: {
    id: number
    nome: string
    email: string
    telefone: string | null
  }
}

export default function ApostasAdminPage() {
  const router = useRouter()
  const [apostas, setApostas] = useState<Aposta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtros, setFiltros] = useState({
    usuarioId: '',
    status: '',
    modalidade: '',
    dataInicio: '',
    dataFim: '',
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  })

  useEffect(() => {
    carregarApostas()
  }, [filtros, pagination.page])

  const carregarApostas = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })

      if (filtros.usuarioId) params.append('usuarioId', filtros.usuarioId)
      if (filtros.status) params.append('status', filtros.status)
      if (filtros.modalidade) params.append('modalidade', filtros.modalidade)
      if (filtros.dataInicio) params.append('dataInicio', filtros.dataInicio)
      if (filtros.dataFim) params.append('dataFim', filtros.dataFim)

      const response = await fetch(`/api/admin/apostas?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Erro ao carregar apostas')
      }

      const data = await response.json()
      setApostas(data.apostas || [])
      setPagination(data.pagination || pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const formatarData = (data: Date | string | null) => {
    if (!data) return '-'
    const d = typeof data === 'string' ? new Date(data) : data
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  const extrairDetalhesAposta = (detalhes: any) => {
    if (!detalhes || typeof detalhes !== 'object') return null

    const betData = detalhes.betData || detalhes
    if (!betData) return null

    const modalidade = betData.modalityName || betData.modalidade || ''
    const position = betData.position || betData.customPositionValue || ''
    const animalBets = betData.animalBets || []
    const numberBets = betData.numberBets || []
    const instant = betData.instant || false

    return {
      modalidade,
      position,
      animalBets,
      numberBets,
      instant,
      resultadoOficial: detalhes.resultadoOficial || null,
      premioTotal: detalhes.premioTotal || null,
    }
  }

  const formatarAnimais = (animalIds: number[]): string => {
    if (!animalIds || animalIds.length === 0) return '-'
    return animalIds
      .map((id) => {
        const animal = ANIMALS.find((a) => a.id === id)
        return animal ? animal.name : `Animal ${id}`
      })
      .join(', ')
  }

  const formatarNumeros = (numeros: string[]): string => {
    if (!numeros || numeros.length === 0) return '-'
    return numeros.join(', ')
  }

  const getStatusBadge = (status: string, retornoPrevisto: number) => {
    if (status === 'liquidado' && retornoPrevisto > 0) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
          Ganhou
        </span>
      )
    }
    if (status === 'perdida' || (status === 'liquidado' && retornoPrevisto === 0)) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
          Perdeu
        </span>
      )
    }
    if (status === 'pendente') {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
          Pendente
        </span>
      )
    }
    return (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
        {status}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Apostas dos Usuários</h1>
          <p className="text-gray-600 mt-2">Visualize todas as apostas realizadas pelos usuários</p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID do Usuário
              </label>
              <input
                type="number"
                value={filtros.usuarioId}
                onChange={(e) => setFiltros({ ...filtros, usuarioId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
                placeholder="Filtrar por usuário"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filtros.status}
                onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value="pendente">Pendente</option>
                <option value="liquidado">Liquidado</option>
                <option value="perdida">Perdida</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modalidade</label>
              <input
                type="text"
                value={filtros.modalidade}
                onChange={(e) => setFiltros({ ...filtros, modalidade: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
                placeholder="Ex: GRUPO, MILHAR"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
              <input
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
              <input
                type="date"
                value={filtros.dataFim}
                onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFiltros({
                    usuarioId: '',
                    status: '',
                    modalidade: '',
                    dataInicio: '',
                    dataFim: '',
                  })
                  setPagination({ ...pagination, page: 1 })
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Tabela de Apostas */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Carregando apostas...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Erro: {error}</p>
          </div>
        ) : apostas.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Nenhuma aposta encontrada</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Modalidade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aposta
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Retorno
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resultado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {apostas.map((aposta) => {
                    const detalhes = extrairDetalhesAposta(aposta.detalhes)
                    const resultadoOficial = detalhes?.resultadoOficial

                    return (
                      <tr key={aposta.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{aposta.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{aposta.usuario.nome}</div>
                          <div className="text-xs text-gray-500">{aposta.usuario.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {aposta.modalidade || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {detalhes ? (
                            <div className="space-y-1">
                              {detalhes.animalBets && detalhes.animalBets.length > 0 ? (
                                <div>
                                  <span className="text-xs text-gray-500">Animais:</span>
                                  {detalhes.animalBets.map((bet: number[], idx: number) => (
                                    <div key={idx} className="text-xs">
                                      {formatarAnimais(bet)}
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                              {detalhes.numberBets && detalhes.numberBets.length > 0 ? (
                                <div>
                                  <span className="text-xs text-gray-500">Números:</span>
                                  <div className="text-xs">{formatarNumeros(detalhes.numberBets)}</div>
                                </div>
                              ) : null}
                              {detalhes.position ? (
                                <div className="text-xs text-gray-500">
                                  Posição: {detalhes.position}
                                </div>
                              ) : null}
                              {detalhes.instant ? (
                                <span className="text-xs text-green-600">⚡ Instantânea</span>
                              ) : null}
                            </div>
                          ) : (
                            aposta.aposta || '-'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatarMoeda(aposta.valor)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {aposta.retornoPrevisto > 0 ? (
                            <span className="text-green-600 font-semibold">
                              {formatarMoeda(aposta.retornoPrevisto)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(aposta.status, aposta.retornoPrevisto)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatarData(aposta.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {resultadoOficial ? (
                            <div className="text-xs">
                              {resultadoOficial.prizes ? (
                                <div>
                                  {resultadoOficial.prizes.slice(0, 5).map((p: number, idx: number) => (
                                    <div key={idx} className="font-mono">
                                      {idx + 1}º: {p.toString().padStart(4, '0')}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400">Sem resultado</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {pagination.totalPages > 1 && (
              <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page >= pagination.totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próxima
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Mostrando <span className="font-medium">{apostas.length}</span> de{' '}
                      <span className="font-medium">{pagination.total}</span> apostas
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                        disabled={pagination.page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Anterior
                      </button>
                      <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                        Página {pagination.page} de {pagination.totalPages}
                      </span>
                      <button
                        onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                        disabled={pagination.page >= pagination.totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Próxima
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
