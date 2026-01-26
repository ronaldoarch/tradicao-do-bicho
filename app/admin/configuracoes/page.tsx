'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface Configuracoes {
  nomePlataforma: string
  numeroSuporte: string
  emailSuporte: string
  whatsappSuporte: string
  logoSite: string
}

interface GateboxConfig {
  username: string
  password: string
  baseUrl: string
  ativo: boolean
  passwordSet: boolean
}

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState<Configuracoes>({
    nomePlataforma: 'Tradição do Bicho',
    numeroSuporte: '(00) 00000-0000',
    emailSuporte: 'suporte@tradicaodobicho.com',
    whatsappSuporte: '5500000000000',
    logoSite: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [gateboxConfig, setGateboxConfig] = useState<GateboxConfig>({
    username: '',
    password: '',
    baseUrl: 'https://api.gatebox.com.br',
    ativo: false,
    passwordSet: false,
  })
  const [savingGatebox, setSavingGatebox] = useState(false)

  useEffect(() => {
    loadConfig()
    loadGateboxConfig()
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

  const loadGateboxConfig = async () => {
    try {
      const response = await fetch('/api/admin/gatebox/config')
      const data = await response.json()
      if (data.config) {
        setGateboxConfig({
          username: data.config.username || '',
          password: '', // Não carregar senha
          baseUrl: data.config.baseUrl || 'https://api.gatebox.com.br',
          ativo: data.config.ativo || false,
          passwordSet: data.config.passwordSet || false,
        })
      }
    } catch (error) {
      console.error('Erro ao carregar configuração Gatebox:', error)
    }
  }

  const handleGateboxSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingGatebox(true)

    try {
      const response = await fetch('/api/admin/gatebox/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: gateboxConfig.username,
          password: gateboxConfig.password || (gateboxConfig.passwordSet ? '***' : ''),
          baseUrl: gateboxConfig.baseUrl,
          ativo: gateboxConfig.ativo,
        }),
      })

      if (response.ok) {
        alert('Configuração do Gatebox salva com sucesso!')
        loadGateboxConfig()
        setGateboxConfig({ ...gateboxConfig, password: '' }) // Limpar campo de senha
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao salvar configuração do Gatebox')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao salvar configuração do Gatebox')
    } finally {
      setSavingGatebox(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    setUploadingLogo(true)

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('type', 'logo')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      const data = await response.json()

      if (data.success) {
        setConfig({ ...config, logoSite: data.url })
      } else {
        alert(data.error || 'Erro ao fazer upload')
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error)
      alert('Erro ao fazer upload do arquivo')
    } finally {
      setUploadingLogo(false)
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
        {/* Upload de Logo do Site */}
        <div className="border-b border-gray-200 pb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Logo do Site (Header)</h2>
          <p className="text-sm text-gray-600 mb-4">
            Esta logo aparece no cabeçalho do site, no lugar do nome da plataforma.
          </p>
          <div className="space-y-4">
            {config.logoSite && (
              <div className="relative w-32 h-32 border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
                <Image
                  src={config.logoSite}
                  alt="Logo do site"
                  fill
                  className="object-contain p-2"
                />
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, logoSite: '' })}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            )}
            <div>
              <input
                type="file"
                id="logo-site-upload"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    handleFileUpload(file)
                  }
                }}
                className="hidden"
                disabled={uploadingLogo}
              />
              <label
                htmlFor="logo-site-upload"
                className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer ${
                  uploadingLogo ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                }`}
              >
                {uploadingLogo ? 'Enviando...' : config.logoSite ? 'Trocar Logo' : 'Upload Logo do Site'}
              </label>
            </div>
          </div>
        </div>

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

      {/* Configuração Gatebox */}
      <form onSubmit={handleGateboxSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-6 mt-8">
        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-xl font-semibold text-gray-900">Configuração Gatebox</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure as credenciais do gateway Gatebox para processar depósitos PIX.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Username (CNPJ)
          </label>
          <input
            type="text"
            value={gateboxConfig.username}
            onChange={(e) => setGateboxConfig({ ...gateboxConfig, username: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
            placeholder="93892492000158"
          />
          <p className="text-xs text-gray-500 mt-1">CNPJ ou username fornecido pela Gatebox</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Senha
          </label>
          <input
            type="password"
            value={gateboxConfig.password}
            onChange={(e) => setGateboxConfig({ ...gateboxConfig, password: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
            placeholder={gateboxConfig.passwordSet ? '••••••••' : 'Digite a senha'}
          />
          <p className="text-xs text-gray-500 mt-1">
            {gateboxConfig.passwordSet 
              ? 'Senha já configurada. Deixe em branco para manter a atual ou digite uma nova para alterar.'
              : 'Senha fornecida pela Gatebox'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Base URL
          </label>
          <input
            type="text"
            value={gateboxConfig.baseUrl}
            onChange={(e) => setGateboxConfig({ ...gateboxConfig, baseUrl: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
            placeholder="https://api.gatebox.com.br"
          />
          <p className="text-xs text-gray-500 mt-1">URL base da API Gatebox</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="gatebox-ativo"
            checked={gateboxConfig.ativo}
            onChange={(e) => setGateboxConfig({ ...gateboxConfig, ativo: e.target.checked })}
            className="w-4 h-4 text-blue border-gray-300 rounded focus:ring-blue"
          />
          <label htmlFor="gatebox-ativo" className="text-sm font-medium text-gray-700">
            Ativar Gateway Gatebox
          </label>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={savingGatebox}
            className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {savingGatebox ? 'Salvando...' : 'Salvar Configuração Gatebox'}
          </button>
        </div>
      </form>
    </div>
  )
}
