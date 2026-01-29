'use client'

import { useEffect, useState, useCallback } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BottomNav from '@/components/BottomNav'

interface Aposta {
  id: number
  tipo?: 'bingo' | 'normal'
  concurso?: string | null
  loteria?: string | null
  estado?: string | null
  horario?: string | null
  dataConcurso?: string | null
  modalidade?: string | null
  aposta?: string | null
  valor: number
  retornoPrevisto?: number | null
  status: 'pendente' | 'ganhou' | 'perdeu'
  detalhes?: any
}

export default function MinhasApostasPage() {
  const [apostas, setApostas] = useState<Aposta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selecionada, setSelecionada] = useState<Aposta | null>(null)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date>(new Date())

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/apostas', { 
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao carregar apostas')
      }
      setApostas(data.apostas || [])
      setUltimaAtualizacao(new Date())
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar apostas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Carregar imediatamente
    load()
    
    // Auto-refresh a cada 30 segundos para atualizar resultados
    const interval = setInterval(() => {
      console.log('🔄 Atualizando apostas automaticamente...')
      load()
    }, 30000) // 30 segundos
    
    return () => clearInterval(interval)
  }, [load])

  return (
    <div className="flex min-h-screen flex-col bg-gray-scale-100">
      <Header />
      <main className="relative flex flex-1 flex-col overflow-auto bg-gray-scale-100 text-[#1C1C1C]">
        <div className="mx-auto flex w-full max-w-[1286px] flex-col gap-4 px-4 py-6 md:px-6 md:py-8 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Minhas apostas</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={load}
                disabled={loading}
                className="rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Atualizando...' : '🔄 Atualizar'}
              </button>
              {ultimaAtualizacao && typeof window !== 'undefined' && (
                <span className="text-xs text-gray-500">
                  Atualizado: {ultimaAtualizacao.toLocaleTimeString('pt-BR')}
                </span>
              )}
            </div>
          </div>
          {loading && <div className="text-gray-600">Carregando...</div>}
          {error && <div className="text-red-600">{error}</div>}

          {!loading && !error && apostas.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-6 text-sm text-gray-700">
              Nenhuma aposta encontrada. Faça login e realize uma aposta.
            </div>
          )}

          {!loading && !error && apostas.length > 0 && (
            <div className="overflow-x-auto rounded-xl bg-white shadow">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left text-sm font-semibold text-gray-700">
                    <th className="px-4 py-3">Concurso</th>
                    <th className="px-4 py-3">Aposta</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Retorno</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {apostas.map((a) => (
                    <tr key={a.id} className="border-b border-gray-100 text-sm text-gray-800">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{a.concurso || '—'}</div>
                        <div className="text-xs text-gray-500">
                          {[a.loteria, a.estado, a.horario].filter(Boolean).join(' • ')}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {a.tipo === 'bingo' ? (
                          <div className="flex items-center gap-2">
                            <span className="iconify i-material-symbols:event-available text-blue"></span>
                            <span>{a.aposta || a.modalidade || 'Cartela de Bingo'}</span>
                          </div>
                        ) : (
                          a.aposta || a.modalidade || '—'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {a.dataConcurso && typeof window !== 'undefined' 
                          ? new Date(a.dataConcurso).toLocaleString('pt-BR') 
                          : a.dataConcurso 
                            ? new Date(a.dataConcurso).toISOString().split('T')[0]
                            : '—'}
                      </td>
                      <td className="px-4 py-3">R$ {Number(a.valor || 0).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        {a.tipo === 'bingo' && a.detalhes?.emAndamento ? (
                          <span className="text-xs text-gray-500">Aguardando resultado</span>
                        ) : (
                          `R$ ${Number(a.retornoPrevisto || 0).toFixed(2)}`
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            a.status === 'ganhou'
                              ? 'bg-green-100 text-green-800'
                              : a.status === 'pendente'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelecionada(a)}
                          className="text-sm font-semibold text-blue hover:text-blue-700"
                        >
                          Ver detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <BottomNav />

      {selecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl my-auto max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sticky top-0 bg-white pb-2 border-b border-gray-200 -mx-6 px-6 pt-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Detalhes da aposta</h2>
                <p className="text-sm text-gray-500">
                  {selecionada.concurso || '—'} •{' '}
                  {selecionada.dataConcurso && typeof window !== 'undefined'
                    ? new Date(selecionada.dataConcurso).toLocaleString('pt-BR')
                    : selecionada.dataConcurso
                      ? new Date(selecionada.dataConcurso).toISOString().split('T')[0]
                      : '—'}
                </p>
              </div>
              <button
                onClick={() => setSelecionada(null)}
                className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-200"
              >
                Fechar
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-gray-800">
              <Detail label="Modalidade" value={selecionada.modalidade || '—'} />
              <Detail label="Status" value={selecionada.status} />
              <Detail label="Aposta" value={selecionada.aposta || '—'} />
              <Detail
                label="Valor apostado"
                value={`R$ ${Number(selecionada.valor || 0).toFixed(2)}`}
              />
              <Detail
                label="Retorno previsto"
                value={`R$ ${Number(selecionada.retornoPrevisto || 0).toFixed(2)}`}
              />
              <Detail label="Horário" value={selecionada.horario || '—'} />
              <Detail label="Loteria" value={selecionada.loteria || '—'} />
              <Detail label="Estado" value={selecionada.estado || '—'} />
            </div>

            {selecionada.detalhes && (
              <div className="mt-6 rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-800">
                {selecionada.tipo === 'bingo' ? (
                  <>
                    <h3 className="mb-4 font-semibold text-gray-900">Cartela de Bingo</h3>
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-2">Sala: {selecionada.detalhes.salaNome}</p>
                      {selecionada.detalhes.emAndamento && (
                        <p className="text-xs text-yellow-600 font-semibold">Bingo em andamento</p>
                      )}
                      {selecionada.detalhes.numerosSorteados && (
                        <p className="text-xs text-gray-600 mt-2">
                          Números sorteados: {Array.isArray(selecionada.detalhes.numerosSorteados) ? selecionada.detalhes.numerosSorteados.length : 0}/75
                        </p>
                      )}
                    </div>
                    {selecionada.detalhes.numeros && (
                      <div className="max-w-md mx-auto">
                        <CartelaBingoVisual
                          numeros={selecionada.detalhes.numeros}
                          numerosSorteados={selecionada.detalhes.numerosSorteados || []}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <h3 className="mb-2 font-semibold text-gray-900">Palpites</h3>

                    {/* Palpites de animais (animalBets) */}
                    {Array.isArray(selecionada.detalhes?.betData?.animalBets) &&
                      selecionada.detalhes.betData.animalBets.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-2">
                          {selecionada.detalhes.betData.animalBets.map((bet: number[], idx: number) => (
                            <span
                              key={idx}
                              className="flex items-center gap-2 rounded-lg bg-amber-200 px-3 py-1 text-xs font-semibold text-gray-900"
                            >
                              {bet.map((n) => String(n).padStart(2, '0')).join('-')}
                            </span>
                          ))}
                        </div>
                      )}

                    {/* Números ou outros detalhes se existirem */}
                    {selecionada.detalhes?.betData?.numbers && (
                      <div className="mb-2 text-xs text-gray-800">
                        <span className="font-semibold text-gray-900">Números:</span>{' '}
                        {selecionada.detalhes.betData.numbers.join(', ')}
                      </div>
                    )}

                    {/* Fallback: JSON bruto se não houver campos conhecidos */}
                    {!selecionada.detalhes?.betData?.animalBets &&
                      !selecionada.detalhes?.betData?.numbers && (
                        <pre className="whitespace-pre-wrap text-xs text-gray-700">
                          {JSON.stringify(selecionada.detalhes, null, 2)}
                        </pre>
                      )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-semibold text-gray-900">{value}</p>
    </div>
  )
}

function CartelaBingoVisual({
  numeros,
  numerosSorteados,
}: {
  numeros: any
  numerosSorteados: number[]
}) {
  const colunas = ['B', 'I', 'N', 'G', 'O']
  
  // Validar e converter numeros com segurança
  if (!numeros || typeof numeros !== 'object') {
    return <div className="text-sm text-gray-500">Cartela não disponível</div>
  }
  
  const numerosCartela = numeros as { b?: number[]; i?: number[]; n?: number[]; g?: number[]; o?: number[] }
  
  // Validar que todas as colunas existem e são arrays
  const colunasValidas = colunas.every(
    letra => Array.isArray(numerosCartela[letra.toLowerCase() as keyof typeof numerosCartela])
  )
  
  if (!colunasValidas) {
    return <div className="text-sm text-gray-500">Formato de cartela inválido</div>
  }

  return (
    <div className="border-2 border-gray-300 rounded-lg p-4 bg-white">
      <div className="grid grid-cols-5 gap-1 mb-2">
        {colunas.map((letra) => (
          <div key={letra} className="text-center font-bold text-blue text-lg">
            {letra}
          </div>
        ))}
      </div>
      {[0, 1, 2, 3, 4].map((linha) => (
        <div key={linha} className="grid grid-cols-5 gap-1">
          {colunas.map((letra, colIndex) => {
            const colunaKey = letra.toLowerCase() as keyof typeof numerosCartela
            const colunaNumeros = numerosCartela[colunaKey]
            const numero = colunaNumeros && Array.isArray(colunaNumeros) ? colunaNumeros[linha] : null
            const sorteado = numero !== null && numero !== undefined && numerosSorteados.includes(numero)
            const isCentro = linha === 2 && colIndex === 2

            return (
              <div
                key={`${letra}-${linha}`}
                className={`aspect-square flex items-center justify-center border border-gray-300 rounded text-sm font-semibold ${
                  isCentro
                    ? 'bg-blue text-white'
                    : sorteado
                    ? 'bg-green-200 text-green-800'
                    : 'bg-gray-50 text-gray-700'
                }`}
              >
                {isCentro ? 'FREE' : (numero !== null && numero !== undefined ? numero : '')}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
