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
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)
  const [whatsappNumero, setWhatsappNumero] = useState('')
  const [enviandoPDF, setEnviandoPDF] = useState(false)
  const [configDescarga, setConfigDescarga] = useState<{
    whatsappNumero: string
    minutosAntesFechamento: number
    ativo: boolean
  } | null>(null)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [configForm, setConfigForm] = useState({
    whatsappNumero: '',
    minutosAntesFechamento: '10',
    ativo: true,
  })
  const [formData, setFormData] = useState({
    modalidade: '',
    premio: 1,
    limite: '',
    ativo: true,
  })

  useEffect(() => {
    carregarDados()
    carregarConfig()
  }, [activeTab])

  const carregarConfig = async () => {
    try {
      const res = await fetch('/api/admin/descarga/config')
      const data = await res.json()
      if (data.config) {
        setConfigDescarga(data.config)
        setConfigForm({
          whatsappNumero: data.config.whatsappNumero,
          minutosAntesFechamento: data.config.minutosAntesFechamento.toString(),
          ativo: data.config.ativo,
        })
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error)
    }
  }

  const salvarConfig = async () => {
    if (!configForm.whatsappNumero) {
      alert('Digite o número do WhatsApp')
      return
    }

    try {
      const res = await fetch('/api/admin/descarga/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configForm),
      })

      if (res.ok) {
        alert('Configuração salva com sucesso!')
        setShowConfigModal(false)
        carregarConfig()
      } else {
        alert('Erro ao salvar configuração')
      }
    } catch (error) {
      console.error('Erro ao salvar configuração:', error)
      alert('Erro ao salvar configuração')
    }
  }

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

  const handleGerarPDF = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeTab === 'limites') {
        params.append('incluirLimites', 'true')
        params.append('incluirAlertas', 'false')
        params.append('incluirEstatisticas', 'false')
      } else if (activeTab === 'alertas') {
        params.append('incluirLimites', 'false')
        params.append('incluirAlertas', 'true')
        params.append('incluirEstatisticas', 'false')
      } else {
        params.append('incluirLimites', 'true')
        params.append('incluirAlertas', 'true')
        params.append('incluirEstatisticas', 'true')
      }

      const res = await fetch(`/api/admin/descarga/pdf?${params.toString()}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `descarga_${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Erro ao gerar PDF')
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      alert('Erro ao gerar PDF')
    } finally {
      setLoading(false)
    }
  }

  const handleEnviarWhatsApp = async () => {
    if (!whatsappNumero) {
      alert('Digite o número do WhatsApp')
      return
    }

    setEnviandoPDF(true)
    try {
      const params: any = {
        numeroWhatsApp: whatsappNumero,
      }

      if (activeTab === 'limites') {
        params.incluirLimites = true
        params.incluirAlertas = false
        params.incluirEstatisticas = false
      } else if (activeTab === 'alertas') {
        params.incluirLimites = false
        params.incluirAlertas = true
        params.incluirEstatisticas = false
      } else {
        params.incluirLimites = true
        params.incluirAlertas = true
        params.incluirEstatisticas = true
      }

      const res = await fetch('/api/admin/descarga/enviar-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      if (res.ok) {
        const data = await res.json()
        
        // Baixar PDF primeiro
        const pdfBlob = await fetch(`data:application/pdf;base64,${data.pdfBase64}`).then(r => r.blob())
        const url = window.URL.createObjectURL(pdfBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = data.filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        // Abrir WhatsApp
        window.open(data.whatsappLink, '_blank')
        
        setShowWhatsAppModal(false)
        setWhatsappNumero('')
        alert('PDF gerado! Abra o WhatsApp e anexe o arquivo baixado.')
      } else {
        const error = await res.json()
        alert(error.error || 'Erro ao preparar envio')
      }
    } catch (error) {
      console.error('Erro ao enviar via WhatsApp:', error)
      alert('Erro ao preparar envio')
    } finally {
      setEnviandoPDF(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Controle de Descarga / Banca</h1>
        <p className="text-gray-600 mt-2">
          Configure limites por modalidade e prêmio. O sistema gera alertas quando limites são ultrapassados.
        </p>
      </div>

      {/* Botões de ação */}
      <div className="mb-6 flex gap-4 justify-end">
        <button
          onClick={handleGerarPDF}
          disabled={loading}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
        >
          📄 Baixar PDF
        </button>
        <button
          onClick={() => setShowWhatsAppModal(true)}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
        >
          💬 Enviar via WhatsApp
        </button>
      </div>

      {/* Configuração de Envio Automático */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Configuração de Envio Automático</h3>
            <p className="text-sm text-gray-600">
              Configure o envio automático de relatórios via WhatsApp quando limites forem atingidos
            </p>
          </div>
          <button
            onClick={() => setShowConfigModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {configDescarga ? 'Editar Configuração' : 'Configurar'}
          </button>
        </div>
        {configDescarga && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">WhatsApp:</span>
              <span className="ml-2 font-medium">{configDescarga.whatsappNumero}</span>
            </div>
            <div>
              <span className="text-gray-600">Minutos antes:</span>
              <span className="ml-2 font-medium">{configDescarga.minutosAntesFechamento} min</span>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <span className={`ml-2 font-medium ${configDescarga.ativo ? 'text-green-600' : 'text-red-600'}`}>
                {configDescarga.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>
        )}
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
              onClick={() => {
                setShowForm(!showForm)
                setFormData({ modalidade: '', premio: 1, limite: '', ativo: true })
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <span>+</span>
              <span>{showForm ? 'Cancelar' : 'Novo Limite'}</span>
            </button>
          </div>

          {showForm && (
            <div className="bg-white p-6 rounded-lg shadow mb-6 border-2 border-blue-200">
              <h3 className="text-lg font-semibold mb-4 text-blue-900">Configurar Limite de Descarga</h3>
              <p className="text-sm text-gray-600 mb-4">
                Configure quanto você vai bancar para cada modalidade e prêmio
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Modalidade *
                  </label>
                  <select
                    value={formData.modalidade}
                    onChange={(e) => setFormData({ ...formData, modalidade: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">Selecione a modalidade...</option>
                    {MODALIDADES.map((mod) => (
                      <option key={mod} value={mod}>
                        {mod.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prêmio *
                  </label>
                  <select
                    value={formData.premio}
                    onChange={(e) => setFormData({ ...formData, premio: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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
                    Valor Máximo a Bancar (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.limite}
                    onChange={(e) => setFormData({ ...formData, limite: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">Valor máximo que você vai bancar</p>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleSalvarLimite}
                    disabled={!formData.modalidade || !formData.limite}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    Salvar Limite
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

      {/* Modal WhatsApp */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Enviar PDF via WhatsApp</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número do WhatsApp
              </label>
              <input
                type="text"
                value={whatsappNumero}
                onChange={(e) => setWhatsappNumero(e.target.value)}
                placeholder="5500000000000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Formato: código do país + DDD + número (ex: 5521999999999)
              </p>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                O PDF será gerado e baixado automaticamente. Em seguida, o WhatsApp será aberto
                para você anexar o arquivo manualmente.
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowWhatsAppModal(false)
                  setWhatsappNumero('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleEnviarWhatsApp}
                disabled={enviandoPDF || !whatsappNumero}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {enviandoPDF ? 'Gerando...' : 'Gerar e Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Configuração */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Configurar Envio Automático</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número do WhatsApp
                </label>
                <input
                  type="text"
                  value={configForm.whatsappNumero}
                  onChange={(e) => setConfigForm({ ...configForm, whatsappNumero: e.target.value })}
                  placeholder="5511999999999"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formato: código do país + DDD + número (ex: 5521999999999)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minutos antes do fechamento
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={configForm.minutosAntesFechamento}
                  onChange={(e) => setConfigForm({ ...configForm, minutosAntesFechamento: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  O relatório será enviado X minutos antes do fechamento da extração
                </p>
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={configForm.ativo}
                    onChange={(e) => setConfigForm({ ...configForm, ativo: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Ativar envio automático</span>
                </label>
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => {
                  setShowConfigModal(false)
                  carregarConfig()
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={salvarConfig}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
