'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    usuarios: 0,
    saques: 0,
    promocoes: 0,
    banners: 0,
    gateways: 0,
  })

  useEffect(() => {
    // Carregar estatísticas
    const loadStats = async () => {
      try {
    const [usuarios, saques, promocoes, banners, gateways] = await Promise.all([
          fetch('/api/admin/usuarios').then((r) => r.json()).catch(() => ({ total: 0 })),
          fetch('/api/admin/saques').then((r) => r.json()).catch(() => ({ total: 0 })),
          fetch('/api/admin/promocoes').then((r) => r.json()).catch(() => ({ total: 0 })),
          fetch('/api/admin/banners').then((r) => r.json()).catch(() => ({ total: 0 })),
          fetch('/api/admin/gateways').then((r) => r.json()).catch(() => ({ total: 0 })),
        ])

        setStats({
          usuarios: usuarios.total || 0,
          saques: saques.total || 0,
          promocoes: promocoes.total || 0,
          banners: banners.total || 0,
          gateways: gateways.total || 0,
        })
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error)
      }
    }

    loadStats()
  }, [])

  const statCards = [
    { label: 'Usuários', value: stats.usuarios, icon: '👥', href: '/admin/usuarios', color: 'bg-blue' },
    { label: 'Saques Pendentes', value: stats.saques, icon: '💳', href: '/admin/saques', color: 'bg-yellow' },
    { label: 'Promoções Ativas', value: stats.promocoes, icon: '🎁', href: '/admin/promocoes', color: 'bg-green-600' },
    { label: 'Banners', value: stats.banners, icon: '🖼️', href: '/admin/banners', color: 'bg-purple-600' },
    { label: 'Gateways', value: stats.gateways ?? 0, icon: '🔌', href: '/admin/gateways', color: 'bg-sky-600' },
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
            href="/admin/modalidades/new"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue transition-colors"
          >
            <span className="text-2xl">➕</span>
            <span>Nova Modalidade</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
