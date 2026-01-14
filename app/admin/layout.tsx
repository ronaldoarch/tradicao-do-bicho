'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [adminUser, setAdminUser] = useState<{ nome: string; email: string } | null>(null)

  useEffect(() => {
    // Verificar autenticação admin
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/admin/auth/me', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setIsAuthenticated(true)
          setAdminUser(data.user)
        } else {
          setIsAuthenticated(false)
          // Redirecionar para login se não estiver autenticado (exceto se já estiver na página de login)
          if (pathname !== '/admin/login') {
            router.push('/admin/login')
          }
        }
      } catch (error) {
        setIsAuthenticated(false)
        if (pathname !== '/admin/login') {
          router.push('/admin/login')
        }
      }
    }

    checkAuth()
  }, [pathname, router])

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST', credentials: 'include' })
      router.push('/admin/login')
      router.refresh()
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  // Se estiver na página de login, não mostrar o layout
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  // Mostrar loading enquanto verifica autenticação
  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mb-4 text-4xl">🦁</div>
          <p className="text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  // Se não estiver autenticado, não mostrar conteúdo (já redirecionou)
  if (!isAuthenticated) {
    return null
  }

  const menuItems = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/banners', label: 'Banners', icon: '🖼️' },
    { href: '/admin/stories', label: 'Stories', icon: '📱' },
    { href: '/admin/cotacoes', label: 'Cotações', icon: '💰' },
    { href: '/admin/extracoes', label: 'Extrações', icon: '🎲' },
    { href: '/admin/modalidades', label: 'Modalidades', icon: '🎯' },
    { href: '/admin/usuarios', label: 'Usuários', icon: '👥' },
    { href: '/admin/saques', label: 'Saques', icon: '💳' },
    { href: '/admin/promocoes', label: 'Promoções', icon: '🎁' },
    { href: '/admin/gateways', label: 'Gateways', icon: '🔌' },
    { href: '/admin/temas', label: 'Temas', icon: '🎨' },
    { href: '/admin/configuracoes', label: 'Configurações', icon: '⚙️' },
  ]

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="relative w-64 bg-blue text-white shadow-lg flex flex-col">
        <div className="p-6 border-b border-blue-700">
          <h1 className="text-2xl font-bold">🦁 Lot Bicho</h1>
          <p className="text-sm text-blue-200 mt-1">Painel Administrativo</p>
        </div>
        <nav className="p-4 flex-1">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    pathname === item.href
                      ? 'bg-white text-blue font-semibold'
                      : 'hover:bg-blue-700 text-white'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-blue-700 space-y-2">
          {adminUser && (
            <div className="px-4 py-2 text-sm text-blue-200">
              <p className="font-semibold">{adminUser.nome}</p>
              <p className="text-xs">{adminUser.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-700 text-white transition-colors"
          >
            <span>🚪</span>
            <span>Sair</span>
          </button>
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-700 text-white transition-colors"
          >
            <span>←</span>
            <span>Voltar ao Site</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
