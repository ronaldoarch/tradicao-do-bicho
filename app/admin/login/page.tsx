'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Verificar se já está logado
    const checkSession = async () => {
      try {
        console.log('🔍 Login page: Verificando se já está autenticado...')
        const res = await fetch('/api/admin/auth/me', { 
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          }
        })
        
        console.log('📡 Login page: Resposta auth/me:', res.status)
        
        if (res.ok) {
          const data = await res.json()
          // Verificar se realmente tem dados de usuário e é admin
          if (data.user && data.user.isAdmin && data.user.email) {
            console.log('✅ Login page: Já autenticado, redirecionando para /admin')
            // Usar replace para evitar histórico de navegação e delay para evitar race condition
            setTimeout(() => {
              router.replace('/admin')
            }, 100)
          } else {
            console.log('⚠️ Login page: Resposta OK mas dados inválidos:', data)
          }
        } else {
          console.log('ℹ️ Login page: Não autenticado, permanecendo na página de login')
        }
      } catch (error) {
        // Não autenticado, continuar na página de login
        console.log('ℹ️ Login page: Erro ao verificar, permanecendo na página de login:', error)
      }
    }
    
    // Delay pequeno para evitar race condition com layout
    const timeoutId = setTimeout(checkSession, 200)
    return () => clearTimeout(timeoutId)
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao fazer login')
      }

      // Redirecionar para o dashboard admin
      router.push('/admin')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">🦁 Tradição do Bicho</h1>
          <p className="text-blue-200">Painel Administrativo</p>
        </div>

        <div className="rounded-xl bg-white p-8 shadow-2xl">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">Login Administrativo</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:border-blue focus:outline-none"
                placeholder="admin@exemplo.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-gray-700">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:border-blue focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border-2 border-red-200 p-3">
                <p className="text-sm font-semibold text-red-800">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue px-6 py-3 font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 border-t border-gray-200 pt-4">
            <a
              href="/"
              className="block text-center text-sm text-gray-600 hover:text-blue transition-colors"
            >
              ← Voltar ao site
            </a>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-blue-200">
          Acesso restrito a administradores autorizados
        </p>
      </div>
    </div>
  )
}
