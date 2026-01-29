'use client'

import { useEffect, useState, useCallback } from 'react'
import { useConfiguracoes } from '@/hooks/useConfiguracoes'
import ProfileModal from './ProfileModal'

export default function Header() {
  const { configuracoes } = useConfiguracoes()
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [user, setUser] = useState<{
    id: number
    nome: string
    email: string
    telefone: string | null
    saldo: number
    bonus: number
    bonusBloqueado: number
    bonusSemanal: number
  } | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)

  const loadUser = useCallback(async () => {
    if (typeof window === 'undefined') return
    
    try {
      setLoadingUser(true)
      const res = await fetch('/api/auth/me', { cache: 'no-store' })
      if (!res.ok) {
        setUser(null)
        return
      }
      const data = await res.json()
      setUser(data.user || null)
    } catch (e) {
      setUser(null)
    } finally {
      setLoadingUser(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    loadUser()
  }, [loadUser])

  return (
    <header className="sticky top-0 z-30 flex w-full items-center justify-between bg-blue px-4 py-3 text-white lg:px-8">
      <div className="flex items-center gap-4">
        <a href="/" className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            {configuracoes.logoSite ? (
              <img
                src={configuracoes.logoSite}
                alt={configuracoes.nomePlataforma}
                className="h-16 w-auto lg:h-24"
              />
            ) : (
              <span className="text-2xl lg:text-3xl">🦁</span>
            )}
            {!configuracoes.logoSite && (
              <span className="text-xl font-bold text-white lg:text-2xl">{configuracoes.nomePlataforma}</span>
            )}
          </div>
        </a>
      </div>

      <nav className="hidden lg:flex">
        <ul className="flex items-center gap-2">
          <li>
            <a href="/" className="h-12 rounded-2xl px-4 py-2 hover:bg-blue-scale-70 transition-colors">
              Início
            </a>
          </li>
          <li>
            <a href="/jogo-do-bicho" className="h-12 rounded-2xl px-4 py-2 hover:bg-blue-scale-70 transition-colors">
              Apostar
            </a>
          </li>
          <li>
            <a href="/jogo-do-bicho/resultados" className="h-12 rounded-2xl px-4 py-2 hover:bg-blue-scale-70 transition-colors">
              Resultados
            </a>
          </li>
          <li>
            <a href="/minhas-apostas" className="h-12 rounded-2xl px-4 py-2 hover:bg-blue-scale-70 transition-colors">
              Minhas apostas
            </a>
          </li>
          <li>
            <a href="/jogo-do-bicho/cotacao" className="h-12 rounded-2xl px-4 py-2 hover:bg-blue-scale-70 transition-colors">
              Cotação
            </a>
          </li>
          <li>
            <a href="/bingo" className="h-12 rounded-2xl px-4 py-2 hover:bg-blue-scale-70 transition-colors">
              Bingo
            </a>
          </li>
        </ul>
      </nav>

      <div className="flex items-center gap-2 lg:px-2">
        <div className="relative cursor-pointer flex items-center">
          <span className="iconify i-fluent:alert-16-regular text-2xl text-white opacity-50"></span>
        </div>
        {user ? (
          <button
            onClick={() => setProfileModalOpen(true)}
            className="flex cursor-pointer items-center gap-0.5 rounded-xl border border-white/20 bg-transparent px-3 py-2 text-white lg:gap-2 hover:bg-white/10 transition-colors"
          >
            <span className="iconify i-material-symbols:person-outline-rounded" style={{ fontSize: '20px' }}></span>
            <span className="flex items-center gap-1 text-xs lg:text-sm">
              <span className="font-semibold">R$ {user.saldo.toFixed(2)}</span>
            </span>
            <span className="iconify i-mdi:chevron-down"></span>
          </button>
        ) : (
          !loadingUser && (
            <div className="flex items-center gap-2">
              <a
                href="/login"
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
              >
                Entrar
              </a>
              <a
                href="/cadastro"
                className="rounded-xl bg-yellow px-3 py-2 text-sm font-bold text-blue-950 hover:bg-yellow/90 transition-colors"
              >
                Cadastrar
              </a>
            </div>
          )
        )}
      </div>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={user}
        onLogout={async () => {
          await fetch('/api/auth/logout', { method: 'POST' })
          setUser(null)
          setProfileModalOpen(false)
        }}
      />
    </header>
  )
}
