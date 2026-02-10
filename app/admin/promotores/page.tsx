'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Promotor {
  id: number
  nome: string
  email: string
  codigoPromotor: string | null
  totalIndicados: number
  indicadosComDeposito: number
  bonusTotal: number
}

export default function PromotoresPage() {
  const [promotores, setPromotores] = useState<Promotor[]>([])
  const [usuarios, setUsuarios] = useState<{ id: number; nome: string; email: string; isPromotor: boolean }[]>([])
  const [config, setConfig] = useState({ percentualPrimeiroDep: 10, ativo: true })
  const [loading, setLoading] = useState(true)
  const [savingConfig, setSavingConfig] = useState(false)
  const [toggling, setToggling] = useState<number | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [promRes, configRes, usersRes] = await Promise.all([
        fetch('/api/admin/promotores'),
        fetch('/api/admin/promotores/config'),
        fetch('/api/admin/usuarios?limit=500'),
      ])
      const promData = await promRes.json()
      const configData = await configRes.json()
      const usersData = await usersRes.json()

      setPromotores(promData.promotores || [])
      setConfig(configData.config || { percentualPrimeiroDep: 10, ativo: true })
      setUsuarios(usersData.usuarios || [])
    } catch (error) {
      console.error('Erro ao carregar:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingConfig(true)
    try {
      await fetch('/api/admin/promotores/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      alert('Configuração salva!')
    } catch (error) {
      alert('Erro ao salvar')
    } finally {
      setSavingConfig(false)
    }
  }

  const togglePromotor = async (usuarioId: number, isPromotor: boolean) => {
    setToggling(usuarioId)
    try {
      const res = await fetch('/api/admin/promotores/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioId, isPromotor: !isPromotor }),
      })
      const data = await res.json()
      if (res.ok) {
        if (data.codigoPromotor) {
          alert(`Promotor ativado! Código: ${data.codigoPromotor}`)
        }
        loadData()
      } else {
        alert(data.error || 'Erro ao atualizar')
      }
    } catch (error) {
      alert('Erro ao atualizar')
    } finally {
      setToggling(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue border-t-transparent" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Promotores</h1>

      {/* Config */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Configuração</h2>
        <form onSubmit={saveConfig} className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              % do primeiro depósito para o promotor
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={config.percentualPrimeiroDep}
              onChange={(e) => setConfig({ ...config, percentualPrimeiroDep: parseFloat(e.target.value) || 0 })}
              className="w-24 rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <button
            type="submit"
            disabled={savingConfig}
            className="rounded-lg bg-blue px-4 py-2 text-white font-medium hover:bg-blue/90 disabled:opacity-50"
          >
            {savingConfig ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
        <p className="mt-2 text-sm text-gray-500">
          Quando um indicado fizer o primeiro depósito, o promotor recebe esse percentual do valor em bônus.
        </p>
      </div>

      {/* Lista de promotores */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
        <h2 className="text-xl font-semibold text-gray-900 p-6 border-b">Promotores ativos</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Indicados</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Com depósito</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bônus total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {promotores.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Nenhum promotor definido
                  </td>
                </tr>
              ) : (
                promotores.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.nome}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-mono">{p.codigoPromotor || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{p.totalIndicados}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{p.indicadosComDeposito}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600">
                      R$ {(p.bonusTotal || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Definir promotores */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <h2 className="text-xl font-semibold text-gray-900 p-6 border-b">
          Definir promotores (usuários)
        </h2>
        <p className="px-6 py-2 text-sm text-gray-500">
          Selecione os usuários que serão promotores. Eles terão acesso à página &quot;Indique e Ganhe&quot; com link de indicação.
        </p>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Promotor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm text-gray-900">{u.nome}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{u.email}</td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => togglePromotor(u.id, u.isPromotor)}
                      disabled={toggling === u.id}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        u.isPromotor
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      } disabled:opacity-50`}
                    >
                      {toggling === u.id ? '...' : u.isPromotor ? 'Sim' : 'Não'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
