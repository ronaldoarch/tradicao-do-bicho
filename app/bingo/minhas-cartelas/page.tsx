'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BottomNav from '@/components/BottomNav'
import { CartelaNumeros } from '@/lib/bingo-helpers'

interface CartelaBingo {
  id: number
  salaId: number
  usuarioId: number
  numeros: CartelaNumeros
  valorPago: number
  status: string
  premioRecebido: number
  createdAt: string
  sala: {
    id: number
    nome: string
    emAndamento: boolean
    numerosSorteados: number[] | null
    resultadoFinal: any
  }
}

export default function MinhasCartelasPage() {
  const [cartelas, setCartelas] = useState<CartelaBingo[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    carregarCartelas()
  }, [])

  const carregarCartelas = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/bingo/minhas-cartelas')
      const data = await res.json()
      setCartelas(data.cartelas || [])
    } catch (error) {
      console.error('Erro ao carregar cartelas:', error)
      alert('Erro ao carregar cartelas')
    } finally {
      setLoading(false)
    }
  }

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  const formatarData = (data: string) => {
    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const renderizarCartela = (cartela: CartelaBingo) => {
    const numeros = cartela.numeros
    const numerosSorteados = cartela.sala.numerosSorteados || []
    const colunas = ['B', 'I', 'N', 'G', 'O']

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
              const numero = numeros[letra.toLowerCase() as keyof CartelaNumeros][linha]
              const sorteado = numerosSorteados.includes(numero)
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
                  {isCentro ? 'FREE' : numero}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-scale-100">
      <Header />
      <main className="relative flex flex-1 flex-col overflow-auto bg-gray-scale-100 text-[#1C1C1C]">
        <div className="mx-auto flex w-full max-w-[1286px] flex-col gap-4 pt-4 md:gap-6 md:pt-6 lg:gap-8 lg:pt-8 xl:py-6">
          {/* Sub-header */}
          <div className="flex items-center gap-4 bg-blue/10 px-4 py-3">
            <a
              href="/bingo"
              className="flex items-center justify-center rounded-lg p-2 hover:bg-white/20 transition-colors"
            >
              <span className="iconify i-material-symbols:arrow-back text-2xl text-gray-950"></span>
            </a>
            <h1 className="flex-1 text-center text-xl font-bold text-gray-950 md:text-2xl">
              Minhas Cartelas
            </h1>
          </div>

          {/* Content */}
          <div className="rounded-xl bg-white p-4 md:p-6 lg:p-8">
            {loading && (
              <div className="py-8 text-center text-gray-600">Carregando cartelas...</div>
            )}

            {!loading && cartelas.length === 0 && (
              <div className="py-12 text-center">
                <span className="iconify i-material-symbols:ticket text-6xl text-gray-400 mb-4"></span>
                <p className="text-gray-600 mb-4">Você ainda não possui cartelas de bingo.</p>
                <a
                  href="/bingo"
                  className="inline-block bg-blue text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-scale-70 transition-colors"
                >
                  Ver Salas Disponíveis
                </a>
              </div>
            )}

            {!loading && cartelas.length > 0 && (
              <div className="space-y-6">
                {cartelas.map((cartela) => (
                  <div
                    key={cartela.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{cartela.sala.nome}</h3>
                        <p className="text-sm text-gray-600">
                          Comprada em {formatarData(cartela.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            cartela.status === 'ganhou'
                              ? 'bg-green-100 text-green-800'
                              : cartela.status === 'perdida'
                              ? 'bg-red-100 text-red-800'
                              : cartela.sala.emAndamento
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {cartela.status === 'ganhou'
                            ? 'Ganhou'
                            : cartela.status === 'perdida'
                            ? 'Perdida'
                            : cartela.sala.emAndamento
                            ? 'Em Andamento'
                            : 'Aguardando'}
                        </span>
                        {cartela.premioRecebido > 0 && (
                          <p className="text-sm font-bold text-green-600 mt-1">
                            Prêmio: {formatarMoeda(cartela.premioRecebido)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Valor Pago:</span>
                        <span className="font-semibold">{formatarMoeda(cartela.valorPago)}</span>
                      </div>
                      {cartela.sala.emAndamento && cartela.sala.numerosSorteados && (
                        <div className="text-sm text-gray-600 mb-2">
                          Números Sorteados:{' '}
                          <span className="font-semibold">
                            {cartela.sala.numerosSorteados.length}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="max-w-md mx-auto">{renderizarCartela(cartela)}</div>
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
