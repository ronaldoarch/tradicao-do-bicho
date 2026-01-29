'use client'

import { useCallback, useEffect, useState } from 'react'
import { ResultadoItem } from '@/types/resultados'

interface UseResultadosOptions {
  date?: string
  location?: string
}

export function useResultados(initialOptions?: UseResultadosOptions) {
  const [results, setResults] = useState<ResultadoItem[]>([])
  const [updatedAt, setUpdatedAt] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState<boolean>(false)

  const load = useCallback(
    async (options?: UseResultadosOptions) => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        const date = options?.date ?? initialOptions?.date
        const location = options?.location ?? initialOptions?.location
        if (date) params.set('date', date)
        if (location) params.set('location', location)

        const res = await fetch(`/api/resultados?${params.toString()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        })
        const data = await res.json()
        setResults(data.results || [])
        setUpdatedAt(data.updatedAt)
      } catch (error) {
        console.error('Erro ao carregar resultados:', error)
      } finally {
        setLoading(false)
      }
    },
    [initialOptions?.date, initialOptions?.location]
  )

  useEffect(() => {
    load(initialOptions)
  }, [load, initialOptions])

  return { results, updatedAt, loading, load }
}
