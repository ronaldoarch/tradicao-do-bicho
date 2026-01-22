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
  const [activeTab, setActiveTab] = useState<'webhooks' | 'facebook'>('webhooks')
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([])
  const [facebookEvents, setFacebookEvents] = useState<FacebookEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    source: '',
    eventType: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  })

  useEffect(() => {
    carregarEventos()
  }, [activeTab, filters])

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
    </div>
  )
}
