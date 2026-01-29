'use client'

import { useEffect } from 'react'

interface AlertModalProps {
  isOpen: boolean
  title: string
  message: string
  type?: 'error' | 'warning' | 'info' | 'success'
  onClose: () => void
  autoClose?: number // Tempo em ms para fechar automaticamente
}

export default function AlertModal({
  isOpen,
  title,
  message,
  type = 'error',
  onClose,
  autoClose,
}: AlertModalProps) {
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose()
      }, autoClose)
      return () => clearTimeout(timer)
    }
  }, [isOpen, autoClose, onClose])

  if (!isOpen) return null

  const typeStyles = {
    error: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      icon: '❌',
      iconBg: 'bg-red-100',
      titleColor: 'text-red-800',
      messageColor: 'text-red-700',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-300',
      icon: '⚠️',
      iconBg: 'bg-yellow-100',
      titleColor: 'text-yellow-800',
      messageColor: 'text-yellow-700',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      icon: 'ℹ️',
      iconBg: 'bg-blue-100',
      titleColor: 'text-blue-800',
      messageColor: 'text-blue-700',
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-300',
      icon: '✅',
      iconBg: 'bg-green-100',
      titleColor: 'text-green-800',
      messageColor: 'text-green-700',
    },
  }

  const styles = typeStyles[type]

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
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-md rounded-2xl border-2 ${styles.border} ${styles.bg} p-8 shadow-2xl animate-in zoom-in-95 duration-300`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:bg-white/70 hover:text-gray-600 transition-all duration-200"
          aria-label="Fechar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-start gap-5">
          <div className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full ${styles.iconBg} text-3xl shadow-lg`}>
            {styles.icon}
          </div>
          <div className="flex-1 pt-1">
            <h3 className={`mb-3 text-2xl font-bold ${styles.titleColor}`}>{title}</h3>
            <p className={`text-base leading-relaxed whitespace-pre-line ${styles.messageColor}`}>{message}</p>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className={`rounded-xl px-6 py-3 font-semibold text-white transition-all duration-200 shadow-md hover:shadow-lg ${
              type === 'error'
                ? 'bg-red-600 hover:bg-red-700'
                : type === 'warning'
                  ? 'bg-yellow-600 hover:bg-yellow-700'
                  : type === 'info'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  )
}
