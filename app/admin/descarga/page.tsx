'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface LimiteDescarga {
  id: number
  modalidade: string
  premio: number
  limite: number
  ativo: boolean
}

interface AlertaDescarga {
  id: number
  modalidade: string
  premio: number
  limite: number
  totalApostado: number
  excedente: number
  dataConcurso: string | null
  resolvido: boolean
  createdAt: string
}

interface EstatisticaDescarga {
  modalidade: string
  premio: number
  totalApostado: number
  limite: number | null
  excedente: number
  ultrapassou: boolean
}

const MODALIDADES = [
  'GRUPO',
  'DUPLA_GRUPO',
  'TERNO_GRUPO',
  'QUADRA_GRUPO',
  'DEZENA',
  'CENTENA',
  'MILHAR',
  'DEZENA_INVERTIDA',
  'CENTENA_INVERTIDA',
  'MILHAR_INVERTIDA',
  'MILHAR_CENTENA',
  'PASSE',
  'PASSE_VAI_E_VEM',
]

export default function DescargaPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'limites' | 'alertas' | 'estatisticas'>('limites')
  const [limites, setLimites] = useState<LimiteDescarga[]>([])
  const [alertas, setAlertas] = useState<AlertaDescarga[]>([])
  const [estatisticas, setEstatisticas] = useState<EstatisticaDescarga[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    modalidade: '',
    premio: 1,
    limite: '',
    ativo: true,
  })

  useEffect(() => {
    carregarDados()
  }, [activeTab])

  const carregarDados = async () => {
    setLoading(true)
    try {
      if (activeTab === 'limites') {
        const res = await fetch('/api/admin/descarga/limites')
        const data = await res.json()
        setLimites(data.limites || [])
      } else if (activeTab === 'alertas') {
        const res = await fetch('/api/admin/descarga/alertas?resolvido=false')
        const data = await res.json()
        setAlertas(data.alertas || [])
      } else if (activeTab === 'estatisticas') {
        const res = await fetch('/api/admin/descarga/estatisticas')
        const data = await res.json()
        setEstatisticas(data.estatisticas || [])
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSalvarLimite = async () => {
    if (!formData.modalidade || !formData.limite) {
      alert('Preencha todos os campos')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/descarga/limites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modalidade: formData.modalidade,
          premio: formData.premio,
          limite: parseFloat(formData.limite),
          ativo: formData.ativo,
        }),
      })

      if (res.ok) {
        setShowForm(false)
        setFormData({ modalidade: '', premio: 1, limite: '', ativo: true })
        carregarDados()
      } else {
        const error = await res.json()
        alert(error.error || 'Erro ao salvar limite')
      }
    } catch (error) {
      console.error('Erro ao salvar limite:', error)
      alert('Erro ao salvar limite')
    } finally {
      setLoading(false)
    }
  }

  const handleDeletarLimite = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar este limite?')) return

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/descarga/limites?id=${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        carregarDados()
      } else {
        alert('Erro ao deletar limite')
      }
    } catch (error) {
      console.error('Erro ao deletar limite:', error)
      alert('Erro ao deletar limite')
    } finally {
      setLoading(false)
    }
  }

  const handleResolverAlerta = async (alertaId: number) => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/descarga/alertas/resolver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertaId }),
      })

      if (res.ok) {
        carregarDados()
      } else {
        alert('Erro ao resolver alerta')
      }
    } catch (error) {
      console.error('Erro ao resolver alerta:', error)
      alert('Erro ao resolver alerta')
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
        <h1 className="text-3xl font-bold text-gray-900">Controle de Descarga / Banca</h1>
        <p className="text-gray-600 mt-2">
          Configure limites por modalidade e prêmio. O sistema gera alertas quando limites são ultrapassados.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('limites')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'limites'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Limites Configurados
          </button>
          <button
            onClick={() => setActiveTab('alertas')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'alertas'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Alertas ({alertas.length})
          </button>
          <button
            onClick={() => setActiveTab('estatisticas')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'estatisticas'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Estatísticas
          </button>
        </nav>
      </div>

      {/* Conteúdo */}
      {loading && <div className="text-center py-8">Carregando...</div>}

      {activeTab === 'limites' && (
        <div>
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Limites de Descarga</h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {showForm ? 'Cancelar' : '+ Novo Limite'}
            </button>
          </div>

          {showForm && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h3 className="text-lg font-semibold mb-4">Novo Limite</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Modalidade
                  </label>
                  <select
                    value={formData.modalidade}
                    onChange={(e) => setFormData({ ...formData, modalidade: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Selecione...</option>
                    {MODALIDADES.map((mod) => (
                      <option key={mod} value={mod}>
                        {mod}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prêmio
                  </label>
                  <select
                    value={formData.premio}
                    onChange={(e) => setFormData({ ...formData, premio: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {[1, 2, 3, 4, 5].map((p) => (
                      <option key={p} value={p}>
                        {p}º Prêmio
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Limite (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.limite}
                    onChange={(e) => setFormData({ ...formData, limite: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleSalvarLimite}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Modalidade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prêmio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Limite
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {limites.map((limite) => (
                  <tr key={limite.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {limite.modalidade}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {limite.premio}º Prêmio
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatarMoeda(limite.limite)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          limite.ativo
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {limite.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDeletarLimite(limite.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Deletar
                      </button>
                    </td>
                  </tr>
                ))}
                {limites.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      Nenhum limite configurado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'alertas' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Alertas de Descarga</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Modalidade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prêmio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Limite
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Apostado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Excedente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {alertas.map((alerta) => (
                  <tr key={alerta.id} className={alerta.excedente > 0 ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {alerta.modalidade}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {alerta.premio}º Prêmio
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatarMoeda(alerta.limite)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatarMoeda(alerta.totalApostado)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                      {formatarMoeda(alerta.excedente)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {alerta.dataConcurso
                        ? new Date(alerta.dataConcurso).toLocaleDateString('pt-BR')
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleResolverAlerta(alerta.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Resolver
                      </button>
                    </td>
                  </tr>
                ))}
                {alertas.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                      Nenhum alerta pendente
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'estatisticas' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Estatísticas de Descarga</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Modalidade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prêmio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Apostado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Limite
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {estatisticas.map((stat, idx) => (
                  <tr
                    key={`${stat.modalidade}-${stat.premio}-${idx}`}
                    className={stat.ultrapassou ? 'bg-red-50' : ''}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {stat.modalidade}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.premio}º Prêmio
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatarMoeda(stat.totalApostado)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.limite ? formatarMoeda(stat.limite) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {stat.ultrapassou ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Ultrapassado ({formatarMoeda(stat.excedente)})
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Dentro do limite
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {estatisticas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      Nenhuma estatística disponível
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
