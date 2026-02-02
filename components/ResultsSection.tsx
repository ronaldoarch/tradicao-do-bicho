'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useResultados } from '@/hooks/useResultados'
import { ResultadoItem } from '@/types/resultados'
import { formatDateLabel, formatDrawTimeForDisplay, toIsoDate } from '@/lib/resultados-helpers'

export default function ResultsSection() {
  const { results, loading } = useResultados()

  const groups = useMemo(() => {
    if (!results || results.length === 0) return []

    const map = new Map<
      string,
      {
        loteria: string
        drawTime: string
        date: string
        location: string
        rows: ResultadoItem[]
      }
    >()

    results.forEach((r) => {
      const key = `${r.loteria || r.location || ''}|${r.drawTime || ''}|${r.date || ''}`
      const current = map.get(key) || {
        loteria: r.loteria || r.location || 'Resultado',
        drawTime: r.drawTime || '—',
        date: r.date || '',
        location: r.location || r.loteria || '',
        rows: [],
      }
      current.rows.push(r)
      map.set(key, current)
    })

    const timeValue = (label: string) => {
      const m = label.match(/(\d{1,2}):(\d{2})/) || label.match(/(\d{1,2})h(\d{2})/)
      if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
      return Number.MAX_SAFE_INTEGER
    }

    return Array.from(map.values())
      .map((g) => ({
        ...g,
        rows: g.rows.sort((a, b) => {
          const na = parseInt((a.posicao ?? a.position ?? '').toString().replace(/\D/g, '') || '999', 10)
          const nb = parseInt((b.posicao ?? b.position ?? '').toString().replace(/\D/g, '') || '999', 10)
          return na - nb
        }),
      }))
      .sort((a, b) => {
        const da = toIsoDate(a.date)
        const db = toIsoDate(b.date)
        if (da !== db) return db.localeCompare(da)
        return timeValue(a.drawTime) - timeValue(b.drawTime)
      })
      .slice(0, 8) // mostrar até 8 cards como no layout
  }, [results])

  if (loading) {
    return (
      <section className="w-full rounded-xl bg-white p-4 md:p-6 lg:p-8">
        <div className="text-center py-8 text-gray-600">Carregando resultados...</div>
      </section>
    )
  }

  if (!groups.length) {
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

      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g, idx) => (
          <div key={`${g.loteria}-${g.drawTime}-${idx}`} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-blue uppercase">{g.loteria}</h3>
                <p className="text-xs text-gray-600">
                  {formatDateLabel(g.date)} • {formatDrawTimeForDisplay(g.drawTime)}
                </p>
              </div>
              <a
                href="/jogo-do-bicho/resultados"
                className="rounded-lg border border-blue px-3 py-1 text-sm font-semibold text-blue hover:bg-blue/10 transition-colors"
              >
                Ver resultados
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
