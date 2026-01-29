'use client'

import { useEffect } from 'react'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string | React.ReactNode
  type?: 'warning' | 'info' | 'danger' | 'success'
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  icon?: string
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  type = 'warning',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  icon,
}: ConfirmModalProps) {
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
        onCancel()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const typeStyles = {
    warning: {
      bg: 'bg-gradient-to-br from-yellow-50 to-amber-50',
      border: 'border-yellow-400',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      titleColor: 'text-yellow-900',
      messageColor: 'text-yellow-800',
      confirmBtn: 'bg-yellow-600 hover:bg-yellow-700 text-white',
      cancelBtn: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
      icon: icon || '⚠️',
    },
    info: {
      bg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
      border: 'border-blue-400',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      titleColor: 'text-blue-900',
      messageColor: 'text-blue-800',
      confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white',
      cancelBtn: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
      icon: icon || 'ℹ️',
    },
    danger: {
      bg: 'bg-gradient-to-br from-red-50 to-rose-50',
      border: 'border-red-400',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      titleColor: 'text-red-900',
      messageColor: 'text-red-800',
      confirmBtn: 'bg-red-600 hover:bg-red-700 text-white',
      cancelBtn: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
      icon: icon || '🚨',
    },
    success: {
      bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
      border: 'border-green-400',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      titleColor: 'text-green-900',
      messageColor: 'text-green-800',
      confirmBtn: 'bg-green-600 hover:bg-green-700 text-white',
      cancelBtn: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
      icon: icon || '✅',
    },
  }

  const styles = typeStyles[type]

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-lg rounded-2xl border-2 ${styles.border} ${styles.bg} p-8 shadow-2xl animate-in zoom-in-95 duration-300`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
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
            <div className={`text-base leading-relaxed ${styles.messageColor}`}>
              {typeof message === 'string' ? (
                <p className="whitespace-pre-line">{message}</p>
              ) : (
                message
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className={`rounded-xl px-6 py-3 font-semibold transition-all duration-200 ${styles.cancelBtn} shadow-md hover:shadow-lg`}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-xl px-6 py-3 font-semibold transition-all duration-200 ${styles.confirmBtn} shadow-md hover:shadow-lg`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
