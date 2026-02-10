'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'

interface PromotorData {
  isPromotor: boolean
  codigoPromotor?: string
  linkCompleto?: string
  totalIndicados: number
  indicadosComDeposito: number
  bonusTotal: number
  indicacoes: Array<{
    indicado: string
    email: string
    dataCadastro: string
    primeiroDeposito?: number
    bonusPago?: number
    dataPrimeiroDeposito?: string
  }>
  message?: string
}

export default function IndiqueGanhePage() {
  const [data, setData] = useState<PromotorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const res = await fetch('/api/promotor/me')
      const json = await res.json()
      setData(json)
    } catch (error) {
      console.error('Erro ao carregar:', error)
      setData({ isPromotor: false, totalIndicados: 0, indicadosComDeposito: 0, bonusTotal: 0, indicacoes: [] })
    } finally {
      setLoading(false)
    }
  }

  const copyLink = async () => {
    if (!data?.linkCompleto) return
    try {
      await navigator.clipboard.writeText(data.linkCompleto)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      alert('Erro ao copiar')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-scale-100">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue border-t-transparent" />
        </main>
        <Footer />
        <BottomNav />
      </div>
    )
  }

  if (!data?.isPromotor) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-scale-100">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
          <div className="max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Indique e Ganhe</h1>
            <p className="text-gray-600 mb-6">
              {data?.message || 'Você não é promotor. Entre em contato com o suporte para ativar o programa de indicação.'}
            </p>
            <Link
              href="/perfil"
              className="inline-block rounded-xl bg-blue px-6 py-3 font-semibold text-white hover:bg-blue/90"
            >
              Voltar ao Perfil
            </Link>
          </div>
        </main>
        <Footer />
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-scale-100">
      <Header />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto w-full max-w-2xl px-4 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Indique e Ganhe</h1>
          <p className="text-gray-600 mb-6">
            Compartilhe seu link e ganhe um bônus quando seus indicados fizerem o primeiro depósito!
          </p>

          {/* Link e copiar */}
          <div className="rounded-2xl bg-blue p-6 mb-6 text-white">
            <p className="text-sm font-medium text-blue-200 mb-2">Seu link de indicação</p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={data.linkCompleto || ''}
                className="flex-1 rounded-lg bg-white/20 px-4 py-3 text-white placeholder-white/60"
              />
              <button
                onClick={copyLink}
                className="rounded-lg bg-yellow px-4 py-3 font-semibold text-blue-950 hover:bg-yellow/90"
              >
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <p className="text-xs text-blue-200 mt-2">
              Código: <span className="font-mono font-semibold">{data.codigoPromotor}</span>
            </p>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl bg-white p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-blue">{data.totalIndicados}</p>
              <p className="text-sm text-gray-600">Indicados</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-green-600">{data.indicadosComDeposito}</p>
              <p className="text-sm text-gray-600">Com depósito</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-yellow">R$ {data.bonusTotal.toFixed(2)}</p>
              <p className="text-sm text-gray-600">Bônus ganho</p>
            </div>
          </div>

          {/* Lista de indicados */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Seus indicados</h2>
            {data.indicacoes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Nenhum indicado ainda. Compartilhe seu link para começar!
              </p>
            ) : (
              <div className="space-y-3">
                {data.indicacoes.map((ind, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{ind.indicado}</p>
                      <p className="text-sm text-gray-500">{ind.email}</p>
                      <p className="text-xs text-gray-400">
                        Cadastro: {new Date(ind.dataCadastro).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right">
                      {ind.dataPrimeiroDeposito ? (
                        <>
                          <p className="text-sm font-semibold text-green-600">
                            R$ {(ind.bonusPago || 0).toFixed(2)} ganho
                          </p>
                          <p className="text-xs text-gray-500">
                            1º dep: R$ {(ind.primeiroDeposito || 0).toFixed(2)}
                          </p>
                        </>
                      ) : (
                        <span className="text-xs text-amber-600">Aguardando depósito</span>
                      )}
                    </div>
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
