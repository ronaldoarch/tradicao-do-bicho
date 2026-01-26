'use client'

import { useEffect, useState } from 'react'

interface Gateway {
  id: number
  name: string
  type: string
  baseUrl: string
  apiKey: string | null
  username: string | null
  password: string | null
  passwordSet?: boolean
  sandbox: boolean
  active: boolean
}

const emptyForm: Omit<Gateway, 'id' | 'passwordSet'> = {
  name: '',
  type: 'suitpay',
  baseUrl: '',
  apiKey: '',
  username: '',
  password: '',
  sandbox: true,
  active: true,
}

export default function GatewaysPage() {
  const [gateways, setGateways] = useState<Gateway[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Omit<Gateway, 'id' | 'passwordSet'>>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/gateways', { cache: 'no-store' })
      const data = await res.json()
      setGateways(data.gateways || [])
    } catch (error) {
      console.error('Erro ao carregar gateways', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const method = editingId ? 'PUT' : 'POST'
      const body = editingId ? { id: editingId, ...form } : form
      await fetch('/api/admin/gateways', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setForm(emptyForm)
      setEditingId(null)
      load()
    } catch (error) {
      console.error('Erro ao salvar gateway', error)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (gw: Gateway) => {
    setEditingId(gw.id)
    setForm({
      name: gw.name,
      type: gw.type || 'suitpay',
      baseUrl: gw.baseUrl,
      apiKey: gw.apiKey || '',
      username: gw.username || '',
      password: gw.passwordSet ? '***' : '', // Não carregar senha real
      sandbox: gw.sandbox,
      active: gw.active,
    })
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja remover este gateway?')) return
    try {
      await fetch(`/api/admin/gateways?id=${id}`, { method: 'DELETE' })
      load()
    } catch (error) {
      console.error('Erro ao deletar gateway', error)
    }
  }

  const handleToggle = async (gw: Gateway) => {
    try {
      await fetch('/api/admin/gateways', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: gw.id, active: !gw.active }),
      })
      load()
    } catch (error) {
      console.error('Erro ao ativar/desativar gateway', error)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Gateways</h1>
      </div>

      <section className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {editingId ? 'Editar Gateway' : 'Novo Gateway'}
        </h2>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">Nome</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue focus:outline-none"
              placeholder="Gatebox ou SuitPay"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">Tipo</label>
            <select
              required
              value={form.type}
              onChange={(e) => {
                const newType = e.target.value
                setForm({ 
                  ...form, 
                  type: newType,
                  // Limpar campos quando mudar tipo
                  apiKey: newType === 'suitpay' ? form.apiKey : '',
                  username: newType === 'gatebox' ? form.username : '',
                  password: newType === 'gatebox' ? form.password : '',
                  // Ajustar baseUrl padrão
                  baseUrl: newType === 'gatebox' ? 'https://api.gatebox.com.br' : form.baseUrl || 'https://sandbox.ws.suitpay.app',
                })
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue focus:outline-none"
            >
              <option value="suitpay">SuitPay</option>
              <option value="gatebox">Gatebox</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">Base URL</label>
            <input
              required
              value={form.baseUrl}
              onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue focus:outline-none"
              placeholder={form.type === 'gatebox' ? 'https://api.gatebox.com.br' : 'https://sandbox.ws.suitpay.app'}
            />
          </div>
          
          {/* Campos específicos para SuitPay */}
          {form.type === 'suitpay' && (
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-semibold text-gray-700">API Key (Client ID|Client Secret)</label>
              <input
                required={form.type === 'suitpay'}
                type="password"
                value={form.apiKey || ''}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue focus:outline-none"
                placeholder="clientId|clientSecret"
              />
              <p className="text-xs text-gray-500">Formato: ClientID|ClientSecret (separados por |)</p>
            </div>
          )}

          {/* Campos específicos para Gatebox */}
          {form.type === 'gatebox' && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">Username (CNPJ)</label>
                <input
                  required={form.type === 'gatebox'}
                  value={form.username || ''}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue focus:outline-none"
                  placeholder="93892492000158"
                />
                <p className="text-xs text-gray-500">CNPJ ou username fornecido pela Gatebox</p>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">Senha</label>
                <input
                  required={form.type === 'gatebox' && !editingId}
                  type="password"
                  value={form.password || ''}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue focus:outline-none"
                  placeholder={editingId && form.password === '***' ? 'Deixe em branco para manter ou digite nova senha' : 'Digite a senha'}
                />
                {editingId && form.password === '***' && (
                  <p className="text-xs text-gray-500">Deixe em branco para manter a senha atual ou digite uma nova</p>
                )}
              </div>
            </>
          )}

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={form.sandbox}
                onChange={(e) => setForm({ ...form, sandbox: e.target.checked })}
              />
              Sandbox
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Ativo
            </label>
          </div>
          <div className="md:col-span-2 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue px-4 py-2 font-semibold text-white hover:bg-blue-scale-70 transition-colors disabled:opacity-60"
            >
              {editingId ? 'Salvar alterações' : 'Adicionar gateway'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null)
                  setForm(emptyForm)
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Gateways cadastrados</h2>
          {loading && <span className="text-sm text-gray-500">Carregando...</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base URL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sandbox</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ativo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {gateways.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-sm text-gray-500 text-center">
                    Nenhum gateway cadastrado.
                  </td>
                </tr>
              )}
              {gateways.map((gw) => (
                <tr key={gw.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{gw.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{gw.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      gw.type === 'gatebox' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {gw.type === 'gatebox' ? 'Gatebox' : 'SuitPay'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{gw.baseUrl}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`px-2 py-1 rounded-full text-xs ${gw.sandbox ? 'bg-yellow/20 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                      {gw.sandbox ? 'Sandbox' : 'Produção'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleToggle(gw)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${gw.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}
                    >
                      {gw.active ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(gw)}
                        className="rounded-lg border border-gray-200 px-3 py-1 hover:bg-gray-50"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(gw.id)}
                        className="rounded-lg border border-red-200 px-3 py-1 text-red-600 hover:bg-red-50"
                      >
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
