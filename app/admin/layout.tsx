'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

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
    { href: '/admin/configuracoes', label: 'Configurações', icon: '⚙️' },
  ]

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-blue text-white shadow-lg">
        <div className="p-6 border-b border-blue-700">
          <h1 className="text-2xl font-bold">🦁 Lot Bicho</h1>
          <p className="text-sm text-blue-200 mt-1">Painel Administrativo</p>
        </div>
        <nav className="p-4">
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
        <div className="absolute bottom-0 w-64 p-4 border-t border-blue-700">
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
