'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { SPECIAL_TIMES } from '@/data/modalities'

interface Extracao {
  id: number
  name: string
  estado?: string
  realCloseTime?: string
  closeTime: string
  time: string
  active: boolean
  max: number
  days: string
}

type ExtracaoWithMeta = Extracao & {
  closeStr?: string
  closeDate?: Date
  minutesToClose: number
}

interface LocationSelectionProps {
  instant: boolean
  location: string | null
  specialTime: string | null
  onInstantChange: (checked: boolean) => void
  onLocationChange: (locationId: string) => void
  onSpecialTimeChange: (timeId: string | null) => void
}

const CLOSE_THRESHOLD_MINUTES = 5

export default function LocationSelection({
  instant,
  location,
  specialTime,
  onInstantChange,
  onLocationChange,
  onSpecialTimeChange,
}: LocationSelectionProps) {
  const [extracoes, setExtracoes] = useState<Extracao[]>([])
  const [loading, setLoading] = useState(true)
  const [openStates, setOpenStates] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/extracoes')
        const data = await res.json()
        setExtracoes((data?.extracoes || []).filter((e: Extracao) => e.active))
      } catch (error) {
        console.error('Erro ao carregar extrações', error)
      } finally {
        setLoading(false)
      }
    }
    load()
    const timer = setInterval(load, 60_000) // refresca a cada 1 min para trocar automática
    return () => clearInterval(timer)
  }, [])

  // Estado para forçar atualização periódica do tempo
  const [timeKey, setTimeKey] = useState(0)
  
  useEffect(() => {
    // Atualizar a cada minuto para recalcular minutos até fechamento
    const interval = setInterval(() => {
      setTimeKey(prev => prev + 1)
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const normalized = useMemo(() => {
    const now = Date.now()
    return extracoes
      .map((e) => {
        const closeStr = e.realCloseTime || e.closeTime || e.time
        const closeDate = parseTimeToday(closeStr)
        const minutesToClose = closeDate ? (closeDate.getTime() - now) / 60000 : Number.POSITIVE_INFINITY
        return { ...e, closeStr, closeDate, minutesToClose }
      })
      .sort((a, b) => (a.closeDate?.getTime() || 0) - (b.closeDate?.getTime() || 0))
  }, [extracoes, timeKey])

  const available = useMemo(() => {
    return normalized.filter((e) => e.minutesToClose > CLOSE_THRESHOLD_MINUTES)
  }, [normalized])

  const groupedByEstado = useMemo(() => {
    const groups: Record<string, ExtracaoWithMeta[]> = {}
    for (const ext of normalized) {
      const key = ext.estado || 'Outros'
      if (!groups[key]) groups[key] = []
      groups[key].push(ext)
    }
    // ordena estados alfabeticamente
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([estado, items]) => ({ estado, items }))
  }, [normalized])

  const toggleEstado = (estado: string) => {
    setOpenStates((prev) => ({ ...prev, [estado]: !prev[estado] }))
  }

  const hasInitializedRef = useRef(false)
  
  useEffect(() => {
    // abre todos por padrão na primeira carga (apenas uma vez)
    if (!hasInitializedRef.current && groupedByEstado.length > 0 && Object.keys(openStates).length === 0) {
      hasInitializedRef.current = true
      const next: Record<string, boolean> = {}
      groupedByEstado.forEach((g) => {
        next[g.estado] = true
      })
      setOpenStates(next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupedByEstado])

  const onLocationChangeRef = useRef(onLocationChange)
  onLocationChangeRef.current = onLocationChange

  const locationInitializedRef = useRef(false)
  const lastProcessedLocationRef = useRef<string | null>(null)
  const lastAvailableIdsRef = useRef<string>('')
  const isUpdatingRef = useRef(false)
  const availableRef = useRef<ExtracaoWithMeta[]>([])
  const normalizedRef = useRef<ExtracaoWithMeta[]>([])
  
  // Atualizar refs quando os arrays mudarem (sem causar re-renders)
  useEffect(() => {
    const currentAvailableIds = [...available, ...normalized].map(e => e.id.toString()).sort().join(',')
    const idsChanged = lastAvailableIdsRef.current !== currentAvailableIds
    
    if (idsChanged) {
      lastAvailableIdsRef.current = currentAvailableIds
      availableRef.current = available
      normalizedRef.current = normalized
      
      // Se os IDs mudaram e não estamos atualizando, verificar se precisa atualizar location
      if (!isUpdatingRef.current && location) {
        const isLocationStillAvailable = available.some(e => e.id.toString() === location) || 
                                         normalized.some(e => e.id.toString() === location)
        
        if (!isLocationStillAvailable) {
          const current = available.length > 0 ? available[0] : normalized[0]
          if (current && current.id.toString() !== location) {
            const newLocation = current.id.toString()
            if (newLocation !== lastProcessedLocationRef.current) {
              lastProcessedLocationRef.current = newLocation
              isUpdatingRef.current = true
              onLocationChangeRef.current(newLocation)
              setTimeout(() => {
                isUpdatingRef.current = false
              }, 100)
            }
          }
        }
      }
    } else {
      // Atualizar refs mesmo se IDs não mudaram (para manter sincronizado)
      availableRef.current = available
      normalizedRef.current = normalized
    }
  }, [available, normalized]) // Manter apenas available e normalized, sem location
  
  useEffect(() => {
    // Usar refs para acessar valores atuais sem causar re-renders
    const currentAvailable = availableRef.current.length > 0 ? availableRef.current : available
    const currentNormalized = normalizedRef.current.length > 0 ? normalizedRef.current : normalized
    
    if (currentAvailable.length === 0 && currentNormalized.length === 0) return
    if (isUpdatingRef.current) return // Prevenir processamento durante atualização
    
    const current =
      currentAvailable.find((e) => e.id.toString() === location) ||
      (currentAvailable.length > 0 ? currentAvailable[0] : currentNormalized[0])
    
    if (!current) {
      if (location !== lastProcessedLocationRef.current) {
        lastProcessedLocationRef.current = location
      }
      return
    }
    
    // Só inicializar location uma vez quando não há location selecionada
    if (!location && !locationInitializedRef.current) {
      locationInitializedRef.current = true
      const newLocation = current.id.toString()
      // Só atualizar se realmente for diferente
      if (newLocation !== lastProcessedLocationRef.current) {
        lastProcessedLocationRef.current = newLocation
        isUpdatingRef.current = true
        onLocationChangeRef.current(newLocation)
        // Reset flag após um pequeno delay
        setTimeout(() => {
          isUpdatingRef.current = false
        }, 100)
      }
      return
    }
    
    // Atualizar ref com a location atual processada
    // Se estávamos atualizando e agora a location refletiu a mudança, resetar flag
    if (isUpdatingRef.current && location === lastProcessedLocationRef.current) {
      isUpdatingRef.current = false
    }
    
    // Atualizar o ref apenas se não estamos no meio de uma atualização e a location mudou
    if (!isUpdatingRef.current && location !== lastProcessedLocationRef.current) {
      lastProcessedLocationRef.current = location
    }
    
    // Reset flag se location foi limpa
    if (!location) {
      locationInitializedRef.current = false
      isUpdatingRef.current = false
    }
  }, [location]) // Apenas location como dependência - usar refs para available/normalized

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold text-gray-950">Selecione a extração e horário:</h2>

      {/* Instant Checkbox */}
      <div className="mb-6">
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-gray-200 bg-white p-4 hover:border-blue/50 transition-colors">
          <input
            type="checkbox"
            checked={instant}
            onChange={(e) => onInstantChange(e.target.checked)}
            className="h-5 w-5 accent-blue"
          />
          <span className="text-lg font-semibold text-gray-950">INSTANTANEA</span>
        </label>
      </div>

      {/* Extrações do banco agrupadas por estado */}
      <div className="mb-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-950">Extrações ativas (troca automática perto do fechamento):</h3>

        {loading && <p className="text-sm text-gray-500">Carregando extrações...</p>}

        {!loading && normalized.length === 0 && (
          <p className="text-sm text-red-600">Nenhuma extração encontrada.</p>
        )}

        <div className="space-y-3">
          {groupedByEstado.map((group) => (
            <div key={group.estado} className="overflow-hidden rounded-xl border border-blue/60">
              <button
                type="button"
                onClick={() => toggleEstado(group.estado)}
                className="flex w-full items-center justify-between bg-blue/5 px-4 py-3 text-left text-sm font-semibold text-gray-900"
              >
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue"></span>
                  {group.estado}
                </span>
                <span className="text-lg text-blue">{openStates[group.estado] ? '▾' : '▸'}</span>
              </button>
              {openStates[group.estado] && (
                <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-3">
                  {group.items.map((ext) => {
                    const isSelected = location === ext.id.toString()
                    const isClosingSoon = ext.minutesToClose <= CLOSE_THRESHOLD_MINUTES && ext.minutesToClose > 0
                    const closed = ext.minutesToClose <= 0
                    return (
                      <button
                        key={ext.id}
                        onClick={() => !closed && onLocationChange(ext.id.toString())}
                        disabled={closed}
                        className={`flex flex-col items-start rounded-lg border-2 p-4 transition-all ${
                          isSelected ? 'border-blue bg-blue/10 shadow-lg' : 'border-gray-200 bg-white hover:border-blue/50'
                        } ${closed ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.01]'}`}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className="font-semibold text-gray-950">{ext.name}</span>
                          <span className="text-xs font-medium text-gray-500">#{ext.id}</span>
                        </div>
                        <div className="mt-1 text-sm text-gray-700">
                          Fecha às <strong>{ext.closeStr}</strong>
                          {ext.realCloseTime && ext.realCloseTime !== ext.closeTime && (
                            <span className="text-xs text-gray-500"> (apuração: {ext.closeTime})</span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">Dias: {ext.days}</div>
                        {closed ? (
                          <span className="mt-2 inline-flex w-fit rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
                            Encerrada
                          </span>
                        ) : isClosingSoon ? (
                          <span className="mt-2 inline-flex w-fit rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                            Fechando em {Math.max(1, Math.floor(ext.minutesToClose))} min
                          </span>
                        ) : (
                          <span className="mt-2 inline-flex w-fit rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                            Aberta
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Horários especiais */}
      {!instant && SPECIAL_TIMES.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-950">Horários Especiais:</h3>
          <div className="space-y-3">
            {SPECIAL_TIMES.map((time) => {
              const timeIdStr = String(time.id)
              return (
                <label
                  key={time.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
                    specialTime === timeIdStr
                      ? 'border-blue bg-blue/10'
                      : 'border-gray-200 bg-white hover:border-blue/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={specialTime === timeIdStr}
                    onChange={(e) => onSpecialTimeChange(e.target.checked ? timeIdStr : null)}
                    className="h-5 w-5 accent-blue"
                  />
                  <span className="font-semibold text-gray-950">{time.name}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function parseTimeToday(time: string | undefined) {
  if (!time) return undefined
  const [h, m] = time.split(':').map((v) => parseInt(v, 10))
  if (Number.isNaN(h) || Number.isNaN(m)) return undefined
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d
}
