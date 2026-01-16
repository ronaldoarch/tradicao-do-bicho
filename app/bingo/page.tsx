'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BottomNav from '@/components/BottomNav'
import BingoSorteadosCounter from '@/components/BingoSorteadosCounter'

interface SalaBingo {
  id: number
  nome: string
  descricao: string | null
  valorCartela: number
  premioTotal: number
  premioLinha: number
  premioColuna: number
  premioDiagonal: number
  premioBingo: number
  ativa: boolean
  emAndamento: boolean
  dataInicio: string | null
  dataFim: string | null
  numerosSorteados: number[] | null
  _count?: {
    cartelas: number
  }
}

export default function BingoPage() {
  const router = useRouter()
  const [salas, setSalas] = useState<SalaBingo[]>([])
  const [loading, setLoading] = useState(false)
  const [comprando, setComprando] = useState<number | null>(null)

  useEffect(() => {
    carregarSalas()
  }, [])

  const carregarSalas = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/bingo/salas', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
      const data = await res.json()
      console.log('Salas carregadas:', data.salas)
      setSalas(data.salas || [])
    } catch (error) {
      console.error('Erro ao carregar salas:', error)
      alert('Erro ao carregar salas de bingo')
    } finally {
      setLoading(false)
    }
  }

  const handleComprarCartela = async (salaId: number) => {
    if (!confirm('Deseja comprar uma cartela de bingo?')) return

    setComprando(salaId)
    try {
      const res = await fetch('/api/bingo/comprar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salaId }),
      })

      const data = await res.json()

      if (res.ok) {
        alert('Cartela comprada com sucesso!')
        router.push('/bingo/minhas-cartelas')
      } else {
        alert(data.error || 'Erro ao comprar cartela')
      }
    } catch (error) {
      console.error('Erro ao comprar cartela:', error)
      alert('Erro ao comprar cartela')
    } finally {
      setComprando(null)
    }
  }

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-scale-100">
      <Header />
      <main className="relative flex flex-1 flex-col overflow-auto bg-gray-scale-100 text-[#1C1C1C]">
        <div className="mx-auto flex w-full max-w-[1286px] flex-col gap-4 pt-4 md:gap-6 md:pt-6 lg:gap-8 lg:pt-8 xl:py-6">
          {/* Sub-header */}
          <div className="flex items-center gap-4 bg-blue/10 px-4 py-3">
            <a
              href="/"
              className="flex items-center justify-center rounded-lg p-2 hover:bg-white/20 transition-colors"
            >
              <span className="iconify i-material-symbols:arrow-back text-2xl text-gray-950"></span>
            </a>
            <h1 className="flex-1 text-center text-xl font-bold text-gray-950 md:text-2xl">
              Salas de Bingo
            </h1>
            <a
              href="/bingo/minhas-cartelas"
              className="flex items-center justify-center rounded-lg p-2 hover:bg-white/20 transition-colors"
            >
              <span className="iconify i-material-symbols:ticket text-2xl text-gray-950"></span>
            </a>
          </div>

          {/* Content */}
          <div className="rounded-xl bg-white p-4 md:p-6 lg:p-8">
            {loading && (
              <div className="py-8 text-center text-gray-600">Carregando salas...</div>
            )}

            {!loading && salas.length === 0 && (
              <div className="py-12 text-center">
                <span className="iconify i-material-symbols:event-available text-6xl text-gray-400 mb-4"></span>
                <p className="text-gray-600">Nenhuma sala de bingo disponível no momento.</p>
              </div>
            )}

            {!loading && salas.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {salas.map((sala) => (
                  <div
                    key={sala.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{sala.nome}</h3>
                        {sala.descricao && (
                          <p className="text-sm text-gray-600">{sala.descricao}</p>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          sala.emAndamento
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {sala.emAndamento ? 'Em Andamento' : 'Aberta'}
                      </span>
                    </div>

                    {/* Contador de números sorteados */}
                    {sala.emAndamento && sala.numerosSorteados && (
                      <div className="mb-4">
                        <BingoSorteadosCounter
                          salaId={sala.id}
                          numerosSorteados={sala.numerosSorteados}
                          emAndamento={sala.emAndamento}
                        />
                      </div>
                    )}

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Valor da Cartela:</span>
                        <span className="font-bold text-blue">{formatarMoeda(sala.valorCartela)}</span>
                      </div>
                      {sala.premioBingo > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Prêmio Bingo:</span>
                          <span className="font-bold text-green-600">
                            {formatarMoeda(sala.premioBingo)}
                          </span>
                        </div>
                      )}
                      {sala.premioLinha > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Prêmio Linha:</span>
                          <span className="font-semibold text-gray-700">
                            {formatarMoeda(sala.premioLinha)}
                          </span>
                        </div>
                      )}
                      {sala.premioColuna > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Prêmio Coluna:</span>
                          <span className="font-semibold text-gray-700">
                            {formatarMoeda(sala.premioColuna)}
                          </span>
                        </div>
                      )}
                      {sala.premioDiagonal > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Prêmio Diagonal:</span>
                          <span className="font-semibold text-gray-700">
                            {formatarMoeda(sala.premioDiagonal)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                        <span className="text-gray-600">Cartelas Vendidas:</span>
                        <span className="font-semibold text-gray-700">
                          {sala._count?.cartelas || 0}
                        </span>
                      </div>
                    </div>

                    {!sala.emAndamento ? (
                      <button
                        onClick={() => handleComprarCartela(sala.id)}
                        disabled={comprando === sala.id}
                        className="w-full bg-blue text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-scale-70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {comprando === sala.id ? 'Comprando...' : 'Comprar Cartela'}
                      </button>
                    ) : (
                      <div className="text-center py-2 text-sm text-gray-500">
                        Bingo em andamento - Não é possível comprar cartelas
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  )
}
