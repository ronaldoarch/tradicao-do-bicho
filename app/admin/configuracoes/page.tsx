'use client'

import { useEffect, useState } from 'react'

interface Configuracoes {
  nomePlataforma: string
  numeroSuporte: string
  emailSuporte: string
  whatsappSuporte: string
}

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState<Configuracoes>({
    nomePlataforma: 'Lot Bicho',
    numeroSuporte: '(00) 00000-0000',
    emailSuporte: 'suporte@lotbicho.com',
    whatsappSuporte: '5500000000000',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/admin/configuracoes')
      const data = await response.json()
      setConfig(data.configuracoes || config)
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch('/api/admin/configuracoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      if (response.ok) {
        alert('Configurações salvas com sucesso!')
      } else {
        alert('Erro ao salvar configurações')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Configurações Gerais</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Plataforma</label>
          <input
            type="text"
            value={config.nomePlataforma}
            onChange={(e) => setConfig({ ...config, nomePlataforma: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Número de Suporte</label>
          <input
            type="text"
            value={config.numeroSuporte}
            onChange={(e) => setConfig({ ...config, numeroSuporte: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
            placeholder="(00) 00000-0000"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email de Suporte</label>
          <input
            type="email"
            value={config.emailSuporte}
            onChange={(e) => setConfig({ ...config, emailSuporte: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp de Suporte</label>
          <input
            type="text"
            value={config.whatsappSuporte}
            onChange={(e) => setConfig({ ...config, whatsappSuporte: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
            placeholder="5500000000000"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Formato: código do país + DDD + número (sem espaços ou caracteres especiais)</p>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-blue text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </form>
    </div>
  )
}
