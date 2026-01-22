'use client'

import { useState, useEffect } from 'react'

interface WebhookEvent {
  id: number
  source: string
  eventType: string
  payload: any
  headers: any
  status: string
  statusCode: number | null
  response: any
  error: string | null
  processedAt: string | null
  createdAt: string
}

interface FacebookEvent {
  id: number
  eventName: string
  eventId: string | null
  pixelId: string | null
  userData: any
  customData: any
  value: number | null
  currency: string | null
  sourceUrl: string | null
  userAgent: string | null
  ipAddress: string | null
  status: string
  error: string | null
  processedAt: string | null
  createdAt: string
}

export default function TrackingPage() {
  const [activeTab, setActiveTab] = useState<'webhooks' | 'facebook' | 'config'>('webhooks')
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([])
  const [facebookEvents, setFacebookEvents] = useState<FacebookEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [config, setConfig] = useState<{
    facebookPixelId: string | null
    facebookAccessToken: string | null
    webhookUrl: string | null
    ativo: boolean
  } | null>(null)
  const [configForm, setConfigForm] = useState({
    facebookPixelId: '',
    facebookAccessToken: '',
    webhookUrl: '',
    ativo: true,
  })
  const [filters, setFilters] = useState({
    source: '',
    eventType: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  })

  useEffect(() => {
    if (activeTab === 'config') {
      carregarConfig()
    } else {
      carregarEventos()
    }
  }, [activeTab, filters])

  const carregarConfig = async () => {
    try {
      const res = await fetch('/api/admin/tracking/config')
      const data = await res.json()
      if (data.config) {
        setConfig(data.config)
        setConfigForm({
          facebookPixelId: data.config.facebookPixelId || '',
          facebookAccessToken: data.config.facebookAccessToken || '',
          webhookUrl: data.config.webhookUrl || '',
          ativo: data.config.ativo,
        })
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error)
    }
  }

  const salvarConfig = async () => {
    try {
      const res = await fetch('/api/admin/tracking/config', {
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

  const carregarEventos = async () => {
    setLoading(true)
    try {
      if (activeTab === 'webhooks') {
        const params = new URLSearchParams()
        if (filters.source) params.append('source', filters.source)
        if (filters.eventType) params.append('eventType', filters.eventType)
        if (filters.status) params.append('status', filters.status)
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
        if (filters.dateTo) params.append('dateTo', filters.dateTo)

        const res = await fetch(`/api/admin/tracking/webhooks?${params.toString()}`)
        const data = await res.json()
        setWebhookEvents(data.events || [])
      } else {
        const params = new URLSearchParams()
        if (filters.eventType) params.append('eventName', filters.eventType)
        if (filters.status) params.append('status', filters.status)
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
        if (filters.dateTo) params.append('dateTo', filters.dateTo)

        const res = await fetch(`/api/admin/tracking/facebook?${params.toString()}`)
        const data = await res.json()
        setFacebookEvents(data.events || [])
      }
    } catch (error) {
      console.error('Erro ao carregar eventos:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatarData = (data: string) => {
    return new Date(data).toLocaleString('pt-BR')
  }

  const formatarJSON = (obj: any) => {
    try {
      return JSON.stringify(obj, null, 2)
    } catch {
      return String(obj)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tracking de Eventos</h1>
        <p className="text-gray-600 mt-2">Monitore webhooks e eventos do Facebook em tempo real</p>
      </div>

      {/* Botão de Configuração */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => {
            setShowConfigModal(true)
            carregarConfig()
          }}
          className="px-4 py-2 bg-blue text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-semibold shadow-md"
        >
          <span className="text-lg">⚙️</span>
          <span>Configurações</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'webhooks'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🔗 Webhooks ({webhookEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('facebook')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'facebook'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📘 Facebook Events ({facebookEvents.length})
          </button>
        </nav>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {activeTab === 'webhooks' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Origem</label>
                <select
                  value={filters.source}
                  onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Todas</option>
                  <option value="receba">Receba</option>
                  <option value="stripe">Stripe</option>
                  <option value="pagseguro">PagSeguro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Evento</label>
                <input
                  type="text"
                  value={filters.eventType}
                  onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Ex: deposit, payment"
                />
              </div>
            </>
          )}
          {activeTab === 'facebook' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Evento</label>
              <input
                type="text"
                value={filters.eventType}
                onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Ex: PageView, Purchase"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Todos</option>
              <option value="received">Recebido</option>
              <option value="processed">Processado</option>
              <option value="failed">Falhou</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue border-t-transparent"></div>
        </div>
      )}

      {activeTab === 'webhooks' && !loading && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Origem
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status Code
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
                {webhookEvents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      Nenhum evento encontrado
                    </td>
                  </tr>
                ) : (
                  webhookEvents.map((event) => (
                    <tr key={event.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        #{event.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.source}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.eventType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            event.status === 'processed'
                              ? 'bg-green-100 text-green-800'
                              : event.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {event.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.statusCode || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatarData(event.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => {
                            const modal = document.getElementById(`webhook-modal-${event.id}`) as HTMLDialogElement
                            modal?.showModal()
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Ver Detalhes
                        </button>
                        <dialog id={`webhook-modal-${event.id}`} className="modal">
                          <div className="modal-box w-11/12 max-w-5xl">
                            <h3 className="font-bold text-lg mb-4">
                              Webhook Event #{event.id}
                            </h3>
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-semibold mb-2">Payload:</h4>
                                <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-64 text-xs">
                                  {formatarJSON(event.payload)}
                                </pre>
                              </div>
                              {event.headers && (
                                <div>
                                  <h4 className="font-semibold mb-2">Headers:</h4>
                                  <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-32 text-xs">
                                    {formatarJSON(event.headers)}
                                  </pre>
                                </div>
                              )}
                              {event.response && (
                                <div>
                                  <h4 className="font-semibold mb-2">Resposta:</h4>
                                  <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-32 text-xs">
                                    {formatarJSON(event.response)}
                                  </pre>
                                </div>
                              )}
                              {event.error && (
                                <div>
                                  <h4 className="font-semibold mb-2 text-red-600">Erro:</h4>
                                  <p className="text-red-600">{event.error}</p>
                                </div>
                              )}
                            </div>
                            <div className="modal-action">
                              <form method="dialog">
                                <button className="btn">Fechar</button>
                              </form>
                            </div>
                          </div>
                        </dialog>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'facebook' && !loading && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Evento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pixel ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
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
                {facebookEvents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      Nenhum evento encontrado
                    </td>
                  </tr>
                ) : (
                  facebookEvents.map((event) => (
                    <tr key={event.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        #{event.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.eventName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {event.pixelId || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.value
                          ? `${event.currency || 'BRL'} ${event.value.toFixed(2)}`
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            event.status === 'processed'
                              ? 'bg-green-100 text-green-800'
                              : event.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {event.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatarData(event.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => {
                            const modal = document.getElementById(`facebook-modal-${event.id}`) as HTMLDialogElement
                            modal?.showModal()
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Ver Detalhes
                        </button>
                        <dialog id={`facebook-modal-${event.id}`} className="modal">
                          <div className="modal-box w-11/12 max-w-5xl">
                            <h3 className="font-bold text-lg mb-4">
                              Facebook Event #{event.id}
                            </h3>
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-semibold mb-2">Dados do Usuário:</h4>
                                <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-32 text-xs">
                                  {formatarJSON(event.userData)}
                                </pre>
                              </div>
                              {event.customData && (
                                <div>
                                  <h4 className="font-semibold mb-2">Dados Customizados:</h4>
                                  <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-32 text-xs">
                                    {formatarJSON(event.customData)}
                                  </pre>
                                </div>
                              )}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <strong>Event ID:</strong> {event.eventId || '-'}
                                </div>
                                <div>
                                  <strong>Source URL:</strong> {event.sourceUrl || '-'}
                                </div>
                                <div>
                                  <strong>IP Address:</strong> {event.ipAddress || '-'}
                                </div>
                                <div>
                                  <strong>User Agent:</strong>{' '}
                                  {event.userAgent ? (
                                    <span className="text-xs">{event.userAgent.substring(0, 50)}...</span>
                                  ) : (
                                    '-'
                                  )}
                                </div>
                              </div>
                              {event.error && (
                                <div>
                                  <h4 className="font-semibold mb-2 text-red-600">Erro:</h4>
                                  <p className="text-red-600">{event.error}</p>
                                </div>
                              )}
                            </div>
                            <div className="modal-action">
                              <form method="dialog">
                                <button className="btn">Fechar</button>
                              </form>
                            </div>
                          </div>
                        </dialog>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Configuração */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" onClick={() => setShowConfigModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-4">Configurações de Tracking</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Facebook Pixel ID
                </label>
                <input
                  type="text"
                  value={configForm.facebookPixelId}
                  onChange={(e) => setConfigForm({ ...configForm, facebookPixelId: e.target.value })}
                  placeholder="123456789012345"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ID do Pixel do Facebook para rastreamento de eventos
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Facebook Access Token
                </label>
                <input
                  type="password"
                  value={configForm.facebookAccessToken}
                  onChange={(e) => setConfigForm({ ...configForm, facebookAccessToken: e.target.value })}
                  placeholder="EAAxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Token de acesso do Facebook para enviar eventos via Conversions API
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL do Webhook
                </label>
                <input
                  type="url"
                  value={configForm.webhookUrl}
                  onChange={(e) => setConfigForm({ ...configForm, webhookUrl: e.target.value })}
                  placeholder="https://exemplo.com/webhook"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL para receber todos os eventos da plataforma (webhooks, Facebook, etc.)
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
                  <span className="text-sm font-medium text-gray-700">Ativar tracking</span>
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
                className="flex-1 px-4 py-2 bg-blue text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
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
