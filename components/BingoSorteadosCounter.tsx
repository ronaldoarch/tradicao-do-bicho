'use client'

import { useState, useEffect } from 'react'

interface BingoSorteadosCounterProps {
  salaId: number
  numerosSorteados: number[] | null
  emAndamento: boolean
}

export default function BingoSorteadosCounter({
  salaId,
  numerosSorteados: numerosSorteadosProp,
  emAndamento,
}: BingoSorteadosCounterProps) {
  const [numerosSorteados, setNumerosSorteados] = useState<number[]>(numerosSorteadosProp || [])
  const [ultimoNumero, setUltimoNumero] = useState<number | null>(null)

  useEffect(() => {
    setNumerosSorteados(numerosSorteadosProp || [])
    if (numerosSorteadosProp && numerosSorteadosProp.length > 0) {
      setUltimoNumero(numerosSorteadosProp[numerosSorteadosProp.length - 1])
    }
  }, [numerosSorteadosProp])

  // Atualizar contador a cada 5 segundos se a sala estiver em andamento
  useEffect(() => {
    if (!emAndamento) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/bingo/salas`, { 
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        })
        const data = await res.json()
        const sala = data.salas?.find((s: any) => s.id === salaId)
        
        if (sala && sala.numerosSorteados) {
          const novosNumerosArray = Array.isArray(sala.numerosSorteados) 
            ? sala.numerosSorteados 
            : []
          
          setNumerosSorteados((prev) => {
            // Verificar se há novo número sorteado
            if (novosNumerosArray.length > prev.length) {
              setUltimoNumero(novosNumerosArray[novosNumerosArray.length - 1])
            }
            return novosNumerosArray
          })
        }
      } catch (error) {
        console.error('Erro ao atualizar contador:', error)
      }
    }, 5000) // Atualizar a cada 5 segundos

    return () => clearInterval(interval)
  }, [emAndamento, salaId])

  const totalSorteados = numerosSorteados.length
  const totalNumeros = 75
  const porcentagem = Math.round((totalSorteados / totalNumeros) * 100)

  return (
    <div className="rounded-lg bg-gradient-to-r from-blue to-blue-scale-70 p-4 text-white shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="iconify i-material-symbols:event-available text-2xl"></span>
          <h3 className="text-lg font-bold">Números Sorteados</h3>
        </div>
        {emAndamento && (
          <span className="flex items-center gap-1 text-sm">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
            Ao vivo
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mb-2">
        <div className="text-3xl font-bold">
          {totalSorteados} / {totalNumeros}
        </div>
        <div className="text-right">
          <div className="text-sm opacity-90">Progresso</div>
          <div className="text-xl font-semibold">{porcentagem}%</div>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="w-full bg-white/20 rounded-full h-3 mb-3 overflow-hidden">
        <div
          className="bg-yellow h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${porcentagem}%` }}
        ></div>
      </div>

      {/* Último número sorteado */}
      {ultimoNumero && emAndamento && (
        <div className="flex items-center justify-center gap-2 pt-2 border-t border-white/20">
          <span className="text-sm opacity-90">Último número:</span>
          <span className="text-2xl font-bold bg-white/20 px-4 py-1 rounded-lg">
            {ultimoNumero}
          </span>
        </div>
      )}

      {/* Lista dos últimos números sorteados */}
      {numerosSorteados.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/20">
          <div className="text-xs opacity-75 mb-2">Últimos números:</div>
          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
            {numerosSorteados.slice(-10).reverse().map((numero, idx) => (
              <span
                key={`${numero}-${idx}`}
                className="bg-white/20 px-2 py-1 rounded text-xs font-semibold"
              >
                {numero}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
