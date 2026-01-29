'use client'

import { useEffect } from 'react'

interface Cotada {
  numero: string
  cotacao: number
}

interface CotadasWarningModalProps {
  isOpen: boolean
  cotadas: Cotada[]
  modalidade: string
  onConfirm: () => void
  onCancel: () => void
}

export default function CotadasWarningModal({
  isOpen,
  cotadas,
  modalidade,
  onConfirm,
  onCancel,
}: CotadasWarningModalProps) {
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

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl rounded-3xl border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 p-8 shadow-2xl animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-500 hover:bg-white/80 hover:text-gray-700 transition-all duration-200"
          aria-label="Fechar"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100 text-5xl shadow-xl mb-4 animate-pulse">
            ⚠️
          </div>
          <h3 className="text-3xl font-bold text-yellow-900 mb-2">Atenção: Números Cotados</h3>
          <p className="text-lg text-yellow-800">Os seguintes números possuem cotação especial</p>
        </div>

        <div className="bg-white/80 rounded-2xl p-6 mb-6 border-2 border-yellow-200">
          <div className="space-y-3">
            {cotadas.map((cotada, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-yellow-100 to-amber-100 border border-yellow-300 shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-200 text-xl font-bold text-yellow-900 shadow-lg">
                    {cotada.numero}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-yellow-900">Número</p>
                    <p className="text-lg font-mono text-yellow-800">{cotada.numero}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-yellow-900">Cotação</p>
                  <p className="text-2xl font-bold text-yellow-700">{cotada.cotacao}x</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-yellow-100 rounded-xl p-4 mb-6 border-2 border-yellow-300">
          <p className="text-center text-yellow-900 font-semibold">
            <span className="text-xl">📊</span> A cotação será <span className="font-bold text-yellow-700">{cotadas[0]?.cotacao}x</span> ao invés do multiplicador padrão para {modalidade}.
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl px-6 py-4 font-bold text-gray-800 bg-gray-200 hover:bg-gray-300 transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl px-6 py-4 font-bold text-white bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
          >
            Continuar com a Aposta
          </button>
        </div>
      </div>
    </div>
  )
}
