'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useResultados } from '@/hooks/useResultados'
import { ResultadoItem } from '@/types/resultados'

export default function ResultsSection() {
  const { results, loading } = useResultados()

  const latestDraw = useMemo(() => {
    if (!results || results.length === 0) return null
    const first = results[0]
    return {
      date: first.date || '',
      location: first.location || 'Bicho Certo',
      drawTime: first.drawTime || 'Resultado recente',
      rows: results.slice(0, 4),
    }
  }, [results])

  if (loading) {
    return (
      <section className="w-full rounded-xl bg-white p-4 md:p-6 lg:p-8">
        <div className="text-center py-8 text-gray-600">Carregando resultados...</div>
      </section>
    )
  }

  if (!latestDraw) {
    return null
  }

  return (
    <section className="w-full rounded-xl bg-white p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="iconify i-material-symbols:list-alt text-gray-scale-700 text-2xl lg:text-3xl"></span>
          <h2 className="text-lg font-bold uppercase leading-none text-gray-scale-700 md:text-xl lg:text-2xl">
            RESULTADOS
          </h2>
        </div>
        <Link
          href="/jogo-do-bicho/resultados"
          className="text-sm font-semibold text-blue underline hover:text-blue-700 transition-colors"
        >
          Ver todos
        </Link>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="mb-4">
          <h3 className="text-base font-bold text-blue">
            {latestDraw.location} {latestDraw.drawTime ? `• ${latestDraw.drawTime}` : ''}
          </h3>
          {latestDraw.date && <p className="text-sm text-gray-600">Data: {latestDraw.date}</p>}
        </div>
        <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-gray-600">
          <span>Prêmio</span>
          <span>Milhar</span>
          <span>Grupo</span>
          <span>Animal</span>
        </div>
        <div className="mt-2 flex flex-col divide-y divide-gray-200">
          {latestDraw.rows.map((r: ResultadoItem, idx: number) => (
            <div key={idx} className="grid grid-cols-4 gap-2 py-2 text-sm">
              <span className="font-bold text-blue">{r.position}</span>
              <span className="font-semibold text-gray-950">{r.milhar}</span>
              <span className="text-gray-700">{r.grupo}</span>
              <span className="text-gray-700">{r.animal}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
