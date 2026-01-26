'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface DashboardStats {
  usuarios: number
  saquesPendentes: number
  promocoesAtivas: number
  banners: number
  gateways: number
  saldoTotal: number
  periodo: {
    dataInicio: string | null
    dataFim: string | null
    apostas: number
    depositos: number
    saques: number
    valorDepositos: number
    valorSaques: number
    valorApostas: number
    valorPremios: number
    lucroBruto: number
  }
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    usuarios: 0,
    saquesPendentes: 0,
    promocoesAtivas: 0,
    banners: 0,
    gateways: 0,
    saldoTotal: 0,
    periodo: {
      dataInicio: null,
      dataFim: null,
      apostas: 0,
      depositos: 0,
      saques: 0,
      valorDepositos: 0,
      valorSaques: 0,
      valorApostas: 0,
      valorPremios: 0,
      lucroBruto: 0,
    },
  })

  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')
  const [loading, setLoading] = useState(false)

  const loadStats = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtroDataInicio) params.append('dataInicio', filtroDataInicio)
      if (filtroDataFim) params.append('dataFim', filtroDataFim)

      const response = await fetch(`/api/admin/dashboard?${params.toString()}`)
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  const aplicarFiltro = () => {
    loadStats()
  }

  const limparFiltro = () => {
    setFiltroDataInicio('')
    setFiltroDataFim('')
    setTimeout(() => loadStats(), 100)
  }

  const statCards = [
    { label: 'Usuários', value: stats.usuarios, icon: '👥', href: '/admin/usuarios', color: 'bg-blue' },
    { label: 'Saques Pendentes', value: stats.saquesPendentes, icon: '💳', href: '/admin/saques', color: 'bg-yellow' },
    { label: 'Promoções Ativas', value: stats.promocoesAtivas, icon: '🎁', href: '/admin/promocoes', color: 'bg-green-600' },
    { label: 'Banners', value: stats.banners, icon: '🖼️', href: '/admin/banners', color: 'bg-purple-600' },
    { label: 'Gateways', value: stats.gateways ?? 0, icon: '🔌', href: '/admin/gateways', color: 'bg-sky-600' },
    { label: 'Saldo Total', value: `R$ ${stats.saldoTotal.toFixed(2)}`, icon: '💰', href: '#', color: 'bg-emerald-600' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        {loading && (
          <div className="flex items-center gap-2 text-gray-600">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue border-t-transparent"></div>
            <span>Carregando...</span>
          </div>
        )}
      </div>

      {/* Filtros de Data */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Filtros de Período</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Data Início</label>
            <input
              type="date"
              value={filtroDataInicio}
              onChange={(e) => setFiltroDataInicio(e.target.value)}
              className="w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-base focus:border-blue focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Data Fim</label>
            <input
              type="date"
              value={filtroDataFim}
              onChange={(e) => setFiltroDataFim(e.target.value)}
              className="w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-base focus:border-blue focus:outline-none"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={aplicarFiltro}
              disabled={loading}
              className="w-full rounded-lg bg-blue px-4 py-2 text-white font-semibold hover:bg-blue/90 transition-colors disabled:opacity-50"
            >
              Aplicar Filtro
            </button>
            <button
              onClick={limparFiltro}
              disabled={loading}
              className="w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-2 text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Limpar
            </button>
          </div>
        </div>
        {(filtroDataInicio || filtroDataFim) && (
          <div className="mt-4 text-sm text-gray-600">
            <p>
              Período: {filtroDataInicio ? new Date(filtroDataInicio).toLocaleDateString('pt-BR') : 'Início'} até{' '}
              {filtroDataFim ? new Date(filtroDataFim).toLocaleDateString('pt-BR') : 'Fim'}
            </p>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
        {statCards.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`${stat.color} text-white p-4 rounded-lg text-3xl`}>
                {stat.icon}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Estatísticas do Período */}
      {(filtroDataInicio || filtroDataFim) && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Estatísticas do Período</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-blue/10 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Depósitos</p>
              <p className="text-2xl font-bold text-gray-900">
                R$ {stats.periodo.valorDepositos.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{stats.periodo.depositos} transações</p>
            </div>
            <div className="p-4 bg-yellow/10 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Saques</p>
              <p className="text-2xl font-bold text-gray-900">
                R$ {stats.periodo.valorSaques.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{stats.periodo.saques} saques</p>
            </div>
            <div className="p-4 bg-purple-600/10 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Apostas</p>
              <p className="text-2xl font-bold text-gray-900">
                R$ {stats.periodo.valorApostas.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{stats.periodo.apostas} apostas</p>
            </div>
            <div className="p-4 bg-green-600/10 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Prêmios Pagos</p>
              <p className="text-2xl font-bold text-gray-900">
                R$ {stats.periodo.valorPremios.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-emerald-50 rounded-lg border-2 border-emerald-200">
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold text-gray-900">Lucro Bruto do Período</p>
              <p className={`text-2xl font-bold ${stats.periodo.lucroBruto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {stats.periodo.lucroBruto.toFixed(2)}
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Depósitos - Saques - Prêmios
            </p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/admin/banners/new"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue transition-colors"
          >
            <span className="text-2xl">➕</span>
            <span>Novo Banner</span>
          </Link>
          <Link
            href="/admin/promocoes/new"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue transition-colors"
          >
            <span className="text-2xl">➕</span>
            <span>Nova Promoção</span>
          </Link>
          <Link
            href="/admin/modalidades"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue transition-colors"
          >
            <span className="text-2xl">⚙️</span>
            <span>Gerenciar Modalidades</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
