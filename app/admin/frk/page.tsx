'use client'

import { useEffect, useState } from 'react'

interface FrkConfig {
  baseUrl: string
  grant: string
  codigoIntegrador: string
  sistemaId: number
  clienteId: number
  bancaId: number
  chrSerial?: string
  chrCodigoPonto?: string
  chrCodigoOperador?: string
  vchVersaoTerminal: string
}

const emptyConfig: FrkConfig = {
  baseUrl: 'https://frkentrypoint.com/ws.svc',
  grant: '',
  codigoIntegrador: '',
  sistemaId: 9,
  clienteId: 0,
  bancaId: 0,
  chrSerial: '',
  chrCodigoPonto: '',
  chrCodigoOperador: '',
  vchVersaoTerminal: '1.0.0',
}

export default function FrkConfigPage() {
  const [config, setConfig] = useState<FrkConfig>(emptyConfig)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPasswords, setShowPasswords] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/admin/frk/config', {
        credentials: 'include',
      })
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          window.location.href = '/admin/login'
          return
        }
        throw new Error(`Erro ${response.status}`)
      }

      const data = await response.json()
      
      if (data.config) {
        setConfig({
          baseUrl: data.config.baseUrl || emptyConfig.baseUrl,
          grant: data.config.grant === '***' ? '' : (data.config.grant || ''),
          codigoIntegrador: data.config.codigoIntegrador === '***' ? '' : (data.config.codigoIntegrador || ''),
          sistemaId: data.config.sistemaId || 9,
          clienteId: data.config.clienteId || 0,
          bancaId: data.config.bancaId || 0,
          chrSerial: data.config.chrSerial || '',
          chrCodigoPonto: data.config.chrCodigoPonto || '',
          chrCodigoOperador: data.config.chrCodigoOperador || '',
          vchVersaoTerminal: data.config.vchVersaoTerminal || '1.0.0',
        })
      }
    } catch (error) {
      console.error('Erro ao carregar configuração FRK:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch('/api/admin/frk/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config),
      })

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          window.location.href = '/admin/login'
          return
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Erro ${response.status}`)
      }

      const data = await response.json()
      alert(data.message || 'Configuração salva com sucesso!')
      loadConfig() // Recarregar para atualizar valores mascarados
    } catch (error: any) {
      console.error('Erro:', error)
      alert(error.message || 'Erro ao salvar configuração')
    } finally {
      setSaving(false)
    }
  }

  const handleTestAuth = async () => {
    try {
      const response = await fetch('/api/admin/frk/test-auth', {
        method: 'POST',
        credentials: 'include',
      })

      const data = await response.json()

      if (data.success) {
        alert(`✅ Autenticação bem-sucedida!\n\nCódigo de Resposta: ${data.data.codResposta}\nToken: ${data.data.accessToken.substring(0, 20)}...\nExpira em: ${data.data.expiraEm}s`)
      } else {
        throw new Error(data.error || 'Erro ao testar autenticação')
      }
    } catch (error: any) {
      alert(`❌ Erro ao testar autenticação: ${error.message || 'Erro desconhecido'}`)
    }
  }

  const handleTestConnection = async () => {
    try {
      const response = await fetch('/api/admin/frk/extracoes?data=' + new Date().toISOString().split('T')[0], {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        alert(`✅ Conexão OK! Encontradas ${data.extracoes?.length || 0} extrações.`)
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || 'Erro ao testar conexão')
      }
    } catch (error: any) {
      alert(`❌ Erro ao testar conexão: ${error.message || 'Erro desconhecido'}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="mb-4 text-4xl">🔄</div>
          <p className="text-gray-600">Carregando configuração...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuração API FRK</h1>
          <p className="text-gray-600 mt-2">Configure as credenciais para integração com a API FRK de descarga</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleTestAuth}
            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            🔐 Testar Autenticação
          </button>
          <button
            onClick={handleTestConnection}
            className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 transition-colors"
          >
            🧪 Testar Conexão
          </button>
        </div>
      </div>

      <section className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Credenciais da API</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">Base URL *</label>
              <input
                required
                type="url"
                value={config.baseUrl}
                onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue focus:outline-none"
                placeholder="https://frkentrypoint.com/ws.svc"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">Grant *</label>
              <div className="relative">
                <input
                  required
                  type={showPasswords ? 'text' : 'password'}
                  value={config.grant}
                  onChange={(e) => setConfig({ ...config, grant: e.target.value })}
                  className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue focus:outline-none w-full"
                  placeholder="Grant fornecido pelo sistema"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
                >
                  {showPasswords ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">Código Integrador *</label>
              <div className="relative">
                <input
                  required
                  type={showPasswords ? 'text' : 'password'}
                  value={config.codigoIntegrador}
                  onChange={(e) => setConfig({ ...config, codigoIntegrador: e.target.value })}
                  className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue focus:outline-none w-full"
                  placeholder="Código do integrador"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
                >
                  {showPasswords ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">Sistema ID</label>
              <input
                type="number"
                value={config.sistemaId}
                onChange={(e) => setConfig({ ...config, sistemaId: parseInt(e.target.value) || 9 })}
                className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue focus:outline-none"
                placeholder="9"
                readOnly
                disabled
              />
              <p className="text-xs text-gray-500">Sempre 9 (fixo)</p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">Cliente ID *</label>
              <input
                required
                type="number"
                value={config.clienteId || ''}
                onChange={(e) => setConfig({ ...config, clienteId: parseInt(e.target.value) || 0 })}
                className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue focus:outline-none"
                placeholder="2853"
              />
              <p className="text-xs text-gray-500">ID do cliente (ex: 2853)</p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">Banca ID *</label>
              <input
                required
                type="number"
                value={config.bancaId || ''}
                onChange={(e) => setConfig({ ...config, bancaId: parseInt(e.target.value) || 0 })}
                className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue focus:outline-none"
                placeholder="2853"
              />
              <p className="text-xs text-gray-500">Geralmente igual ao Cliente ID</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Campos Opcionais</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">Serial</label>
                <input
                  type="text"
                  value={config.chrSerial || ''}
                  onChange={(e) => setConfig({ ...config, chrSerial: e.target.value })}
                  className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue focus:outline-none"
                  placeholder="Serial do terminal"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">Código do Ponto</label>
                <input
                  type="text"
                  value={config.chrCodigoPonto || ''}
                  onChange={(e) => setConfig({ ...config, chrCodigoPonto: e.target.value })}
                  className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue focus:outline-none"
                  placeholder="Código do ponto"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">Código do Operador</label>
                <input
                  type="text"
                  value={config.chrCodigoOperador || ''}
                  onChange={(e) => setConfig({ ...config, chrCodigoOperador: e.target.value })}
                  className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue focus:outline-none"
                  placeholder="Código do operador"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">Versão do Terminal</label>
                <input
                  type="text"
                  value={config.vchVersaoTerminal}
                  onChange={(e) => setConfig({ ...config, vchVersaoTerminal: e.target.value })}
                  className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue focus:outline-none"
                  placeholder="1.0.0"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue px-6 py-3 font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Salvando...' : 'Salvar Configuração'}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-blue-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">ℹ️ Informações</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>• <strong>Grant</strong> e <strong>Código Integrador</strong> serão fornecidos pelo sistema de integração</li>
          <li>• <strong>Cliente ID</strong> e <strong>Banca ID</strong> geralmente são iguais (ex: 2853)</li>
          <li>• Os campos opcionais podem ser preenchidos posteriormente</li>
          <li>• A descarga automática será executada quando limites forem ultrapassados</li>
          <li>• Use o botão "Testar Conexão" para verificar se as credenciais estão corretas</li>
        </ul>
      </section>
    </div>
  )
}
