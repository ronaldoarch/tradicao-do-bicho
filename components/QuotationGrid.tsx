'use client'

import { useState, useEffect, useCallback } from 'react'
import SpecialQuotationsModal from './SpecialQuotationsModal'

interface Modality {
  id: number
  name: string
  value: string
  hasLink: boolean
  active?: boolean
}

export default function QuotationGrid() {
  const [showSpecialModal, setShowSpecialModal] = useState(false)
  const [modalidades, setModalidades] = useState<Modality[]>([])
  const [loading, setLoading] = useState(true)

  const loadModalidades = useCallback(async () => {
    try {
      const res = await fetch('/api/modalidades', { cache: 'no-store' })
      const data = await res.json()
      setModalidades(data.modalidades || [])
    } catch (error) {
      console.error('Erro ao carregar modalidades:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadModalidades()
  }, [loadModalidades])

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">Carregando cotações...</div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {modalidades.map((quotation) => (
          <div
            key={quotation.id}
            className="flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="mb-2 text-lg font-bold text-gray-950">{quotation.name}</h3>
            <p className="mb-4 text-2xl font-extrabold text-blue">{quotation.value}</p>

            {quotation.hasLink && (
              <button
                onClick={() => setShowSpecialModal(true)}
                className="mb-3 flex items-center gap-1 text-sm text-blue underline hover:text-blue-scale-70 transition-colors"
              >
                Ver cotações
                <span className="iconify i-material-symbols:arrow-drop-down text-lg"></span>
              </button>
            )}

            <button className="mt-auto rounded-lg bg-blue px-4 py-2 font-semibold text-white hover:bg-blue-scale-70 transition-colors">
              JOGAR
            </button>
          </div>
        ))}
      </div>

      <SpecialQuotationsModal
        isOpen={showSpecialModal}
        onClose={() => setShowSpecialModal(false)}
      />
    </>
  )
}
