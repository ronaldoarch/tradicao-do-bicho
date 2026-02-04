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
        alert(`✅ Autenticação bem-sucedida!\n\nCódigo de Resposta: ${data.data.codResposta}\nMensagem: ${data.data.mensagem}\nToken: ${data.data.accessToken.substring(0, 20)}...\nExpira em: ${data.data.expiraEm}s`)
      } else {
        const errorMsg = data.error || 'Erro ao testar autenticação'
        const details = data.details ? `\n\nDetalhes: ${data.details.substring(0, 200)}` : ''
        alert(`❌ Erro ao testar autenticação\n\n${errorMsg}${details}`)
      }
    } catch (error: any) {
      console.error('Erro ao testar autenticação:', error)
      alert(`❌ Erro ao testar autenticação: ${error.message || 'Erro desconhecido'}\n\nVerifique o console para mais detalhes.`)
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

  const handleTestDescarga = async () => {
    try {
      const hoje = new Date()
      const dataJogo = hoje.toISOString().split('T')[0] // YYYY-MM-DD
      const dataHora = hoje.toISOString().slice(0, 16).replace('T', ' ') // YYYY-MM-DD HH:mm

      // Aposta de teste: milhar 1234, prêmio 1º, valor R$ 10,00
      const apostas = [{
        modalidade: 'MILHAR',
        tipo: '',
        numero: '1234',
        premio: 1,
        valor: 10.00,
      }]

      const response = await fetch('/api/admin/frk/descarga', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          dataJogo,
          dataHora,
          extracao: 130, // Extração de teste
          apostas,
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert(`✅ Descarga bem-sucedida!\n\nCódigo: ${data.resultado?.CodResposta || 'N/A'}\nMensagem: ${data.resultado?.Mensagem || data.message}\nPule: ${data.resultado?.intNumeroPule || 'N/A'}`)
      } else {
        throw new Error(data.error || data.message || 'Erro ao testar descarga')
      }
    } catch (error: any) {
      console.error('Erro ao testar descarga:', error)
      alert(`❌ Erro ao testar descarga: ${error.message || 'Erro desconhecido'}\n\nVerifique:\n- Configuração FRK salva\n- chrSerial, chrCodigoPonto, chrCodigoOperador preenchidos\n- Extração 130 cadastrada`)
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
          <button
            onClick={handleTestDescarga}
            className="rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white hover:bg-purple-700 transition-colors"
          >
            📤 Testar Descarga
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

      <section className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Teste de Descarga</h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-700 mb-2">
            <strong>Dados de teste fornecidos:</strong>
          </p>
          <ul className="text-xs text-gray-600 space-y-1 font-mono">
            <li>• chrSerial: <code className="bg-white px-1 rounded">99073001</code></li>
            <li>• chrCodigoPonto: <code className="bg-white px-1 rounded">073001</code></li>
            <li>• chrCodigoOperador: <code className="bg-white px-1 rounded">00073001</code></li>
            <li>• tnyExtracao: <code className="bg-white px-1 rounded">130</code></li>
            <li>• sntTipoJogo: <code className="bg-white px-1 rounded">1 (milhar)</code></li>
          </ul>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Preencha os campos acima com os valores de teste e clique em <strong>"📤 Testar Descarga"</strong> para enviar uma aposta de teste (milhar 1234, 1º prêmio, R$ 10,00) para a extração 130.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleTestDescarga}
            className="rounded-lg bg-purple-600 px-6 py-2 font-semibold text-white hover:bg-purple-700 transition-colors"
          >
            📤 Testar Descarga (Extração 130)
          </button>
        </div>
      </section>

      <section className="bg-blue-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">ℹ️ Informações</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>• <strong>Grant</strong> e <strong>Código Integrador</strong> serão fornecidos pelo sistema de integração</li>
          <li>• <strong>Cliente ID</strong> e <strong>Banca ID</strong> geralmente são iguais (ex: 2853)</li>
          <li>• Preencha <strong>chrSerial</strong>, <strong>chrCodigoPonto</strong> e <strong>chrCodigoOperador</strong> para testar descarga</li>
          <li>• A descarga automática será executada quando limites forem ultrapassados</li>
          <li>• Use os botões de teste para verificar cada etapa da integração</li>
        </ul>
      </section>
    </div>
  )
}
