'use client'

import { useEffect } from 'react'
import Link from 'next/link'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  user: {
    id: number
    nome: string
    email: string
    telefone: string | null
    saldo: number
    bonus: number
    bonusBloqueado: number
    bonusSemanal: number
  } | null
  onLogout: () => Promise<void> | void
}

export default function ProfileModal({ isOpen, onClose, user, onLogout }: ProfileModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleLogout = async () => {
    if (confirm('Tem certeza que deseja sair?')) {
      await onLogout()
      onClose()
      window.location.href = '/'
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-transparent"
      onClick={onClose}
    >
      <div
        className="absolute right-4 top-16 w-full max-w-md rounded-2xl bg-blue p-6 shadow-2xl md:right-8 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão fechar */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-white hover:text-gray-300 transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {!user ? (
          <div className="py-8 text-center text-white space-y-4">
            <p className="text-lg font-semibold">Você não está logado.</p>
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/login"
                onClick={onClose}
                className="rounded-xl border border-white/30 px-4 py-2 text-white hover:bg-white/10 transition-colors"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                onClick={onClose}
                className="rounded-xl bg-yellow px-4 py-2 font-bold text-blue-950 hover:bg-yellow/90 transition-colors"
              >
                Cadastrar
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Header do Perfil */}
            <div className="mb-6 flex items-center justify-between pr-8">
              <h2 className="text-xl font-bold text-white md:text-2xl">{user.nome}</h2>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors"
              >
                <span className="iconify i-material-symbols:logout text-lg"></span>
                <span>Sair</span>
              </button>
            </div>

            {/* Bônus Semanal */}
            <div className="mb-6 rounded-xl border-2 border-white/20 bg-white/5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="iconify i-material-symbols:card-giftcard text-xl text-white"></span>
                  <span className="font-semibold text-white">Bônus semanal</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-yellow md:text-lg">{user.bonusSemanal || 0}%</span>
                  <div className="relative h-10 w-10">
                    <svg className="h-10 w-10 -rotate-90 transform" viewBox="0 0 36 36">
                      <circle
                        cx="18"
                        cy="18"
                        r="16"
                        fill="none"
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth="3"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="16"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                        strokeDasharray={`${((user.bonusSemanal || 0) / 100) * 100.48}, 100.48`}
                      />
                    </svg>
                  </div>
                </div>
              </div>
              <Link
                href="/bônus-semanal"
                className="text-sm font-semibold text-yellow hover:text-yellow/80 transition-colors"
              >
                Saiba mais
              </Link>
            </div>

            {/* Informações Financeiras */}
            <div className="mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Saldo:</span>
                <span className="text-lg font-bold text-white md:text-xl">R$ {user.saldo.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Bônus:</span>
                <span className="text-lg font-bold text-white md:text-xl">R$ {user.bonus.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Bônus bloqueado:</span>
                <span className="text-lg font-bold text-white md:text-xl">R$ {user.bonusBloqueado.toFixed(2)}</span>
              </div>
            </div>

            {/* Links de Ação */}
            <div className="mb-6 space-y-3">
              <Link
                href="/minhas-apostas"
                onClick={onClose}
                className="flex items-center gap-3 rounded-lg p-3 text-yellow hover:bg-white/10 transition-colors"
              >
                <span className="iconify i-material-symbols:receipt text-xl"></span>
                <span className="font-semibold">Minhas apostas</span>
              </Link>

              <Link
                href="/carteira"
                onClick={onClose}
                className="flex items-center gap-3 rounded-lg border-2 border-white/20 bg-white/5 p-3 text-white hover:bg-white/10 transition-colors"
              >
                <span className="iconify i-material-symbols:account-balance-wallet text-xl"></span>
                <span className="font-semibold">Carteira</span>
              </Link>
            </div>

            {/* Botão Depositar */}
            <Link
              href="/depositar"
              onClick={onClose}
              className="block w-full rounded-xl bg-yellow px-6 py-4 text-center text-base font-bold text-blue-950 hover:bg-yellow/90 transition-colors md:text-lg"
            >
              Depositar
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
