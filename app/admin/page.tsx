'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface DashboardStats {
  usuarios: number
  saquesPendentes: number
  saquesAprovados: number
  depositosAprovados: number
  valorDepositosAprovados: number
  promocoesAtivas: number
  saldoTotal: number
  premiosPagar: number
  ultimoRelatorioDescarga: string | null
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
    saquesAprovados: 0,
    depositosAprovados: 0,
    valorDepositosAprovados: 0,
    promocoesAtivas: 0,
    saldoTotal: 0,
    premiosPagar: 0,
    ultimoRelatorioDescarga: null,
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

  const formatarDataRelativa = (dataStr: string | null) => {
    if (!dataStr) return 'Nenhum'
    const d = new Date(dataStr)
    const agora = new Date()
    const diff = agora.getTime() - d.getTime()
    const minutos = Math.floor(diff / 60000)
    const horas = Math.floor(minutos / 60)
    const dias = Math.floor(horas / 24)
    if (minutos < 1) return 'Agora'
    if (minutos < 60) return `${minutos} min atrás`
    if (horas < 24) return `${horas}h atrás`
    if (dias < 7) return `${dias} dia(s) atrás`
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const statCards = [
    {
      label: 'Usuários',
      value: stats.usuarios.toLocaleString('pt-BR'),
      sublabel: 'cadastrados',
      href: '/admin/usuarios',
      icon: '👥',
      color: 'from-slate-700 to-slate-800',
      bgLight: 'bg-slate-50',
    },
    {
      label: 'Saques Pendentes',
      value: stats.saquesPendentes.toString(),
      sublabel: 'aguardando',
      href: '/admin/saques',
      icon: '⏳',
      color: 'from-amber-600 to-amber-700',
      bgLight: 'bg-amber-50',
    },
    {
      label: 'Saques Aprovados',
      value: stats.saquesAprovados.toLocaleString('pt-BR'),
      sublabel: 'processados',
      href: '/admin/saques',
      icon: '✅',
      color: 'from-emerald-600 to-emerald-700',
      bgLight: 'bg-emerald-50',
    },
    {
      label: 'Depósitos Aprovados',
      value: stats.depositosAprovados.toLocaleString('pt-BR'),
      sublabel: `R$ ${stats.valorDepositosAprovados.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total`,
      href: '/admin/usuarios',
      icon: '💳',
      color: 'from-cyan-600 to-cyan-700',
      bgLight: 'bg-cyan-50',
    },
    {
      label: 'Promoções Ativas',
      value: stats.promocoesAtivas.toString(),
      sublabel: 'em vigor',
      href: '/admin/promocoes',
      icon: '🎁',
      color: 'from-violet-600 to-violet-700',
      bgLight: 'bg-violet-50',
    },
    {
      label: 'Saldo Total',
      value: `R$ ${stats.saldoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sublabel: 'plataforma',
      href: '#',
      icon: '💰',
      color: 'from-blue-600 to-blue-700',
      bgLight: 'bg-blue-50',
    },
    {
      label: 'Premiações a Pagar',
      value: `R$ ${stats.premiosPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sublabel: 'estimativa pendentes',
      href: '/admin/usuarios',
      icon: '🏆',
      color: 'from-rose-600 to-rose-700',
      bgLight: 'bg-rose-50',
    },
    {
      label: 'Relatório Descarga',
      value: formatarDataRelativa(stats.ultimoRelatorioDescarga),
      sublabel: 'último envio',
      href: '/admin/descarga',
      icon: '📤',
      color: 'from-teal-600 to-teal-700',
      bgLight: 'bg-teal-50',
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Dashboard
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Visão geral da plataforma
              </p>
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-slate-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                <span className="text-sm font-medium">Carregando...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtros */}
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
            Período
          </h2>
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[140px]">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Data Início
              </label>
              <input
                type="date"
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="min-w-[140px]">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Data Fim
              </label>
              <input
                type="date"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={aplicarFiltro}
                disabled={loading}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                Aplicar
              </button>
              <button
                onClick={limparFiltro}
                disabled={loading}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Limpar
              </button>
            </div>
            {(filtroDataInicio || filtroDataFim) && (
              <span className="text-xs text-slate-500">
                {filtroDataInicio ? new Date(filtroDataInicio).toLocaleDateString('pt-BR') : 'Início'} até{' '}
                {filtroDataFim ? new Date(filtroDataFim).toLocaleDateString('pt-BR') : 'Hoje'}
              </span>
            )}
          </div>
        </div>

        {/* Cards principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-slate-300"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 truncate">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {stat.sublabel}
                  </p>
                </div>
                <div className={`ml-3 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${stat.color} text-white text-xl shadow-sm`}>
                  {stat.icon}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Estatísticas do Período */}
        {(filtroDataInicio || filtroDataFim) && (
          <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
              Estatísticas do Período
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Depósitos</p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  R$ {stats.periodo.valorDepositos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-400">{stats.periodo.depositos} transações</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Saques</p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  R$ {stats.periodo.valorSaques.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-400">{stats.periodo.saques} saques</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Apostas</p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  R$ {stats.periodo.valorApostas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-400">{stats.periodo.apostas} apostas</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Prêmios Pagos</p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  R$ {stats.periodo.valorPremios.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Lucro Bruto do Período</p>
                  <p className="text-xs text-slate-500 mt-0.5">Depósitos − Saques − Prêmios</p>
                </div>
                <p className={`text-xl font-bold ${stats.periodo.lucroBruto >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  R$ {stats.periodo.lucroBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Ações Rápidas */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
            Ações Rápidas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Link
              href="/admin/banners/new"
              className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
            >
              <span className="text-lg">➕</span>
              Novo Banner
            </Link>
            <Link
              href="/admin/promocoes/new"
              className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
            >
              <span className="text-lg">➕</span>
              Nova Promoção
            </Link>
            <Link
              href="/admin/descarga"
              className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
            >
              <span className="text-lg">📤</span>
              Descarga / Relatórios
            </Link>
            <Link
              href="/admin/modalidades"
              className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
            >
              <span className="text-lg">⚙️</span>
              Modalidades
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
