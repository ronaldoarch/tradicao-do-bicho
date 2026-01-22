'use client'

import { useEffect, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Autoplay } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'

interface Quotation {
  id: number
  name: string
  value: string
}

export default function LiveQuotation() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadQuotations()
  }, [])

  const loadQuotations = async () => {
    try {
      const res = await fetch('/api/modalidades', { cache: 'no-store' })
      const data = await res.json()
      const modalidades = data.modalidades || []
      
      // Selecionar algumas modalidades principais para exibir (priorizar as mais populares)
      const featuredModalities = [
        { name: 'Quina de Grupo', id: 5 },
        { name: 'Milhar/Centena', id: 10 },
        { name: 'Milhar Invertida', id: 13 },
        { name: 'Milhar', id: 9 },
        { name: 'Terno de Dezena', id: 7 },
        { name: 'Quadra de Grupo', id: 4 },
      ]
      
      const featured = featuredModalities
        .map((fm) => modalidades.find((m: Quotation) => m.name === fm.name || m.id === fm.id))
        .filter((m): m is Quotation => m !== undefined)
        .slice(0, 6) // Limitar a 6 cotações
      
      setQuotations(featured.length > 0 ? featured : modalidades.slice(0, 6))
    } catch (error) {
      console.error('Erro ao carregar cotações:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <section className="w-full rounded-xl bg-white p-4 md:p-6 lg:p-8">
        <div className="text-center py-8 text-gray-500">Carregando cotações...</div>
      </section>
    )
  }

  if (quotations.length === 0) {
    return null
  }

  return (
    <section className="w-full rounded-xl bg-white p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <span className="iconify i-fluent:live-24-regular text-gray-scale-700 text-2xl lg:text-3xl"></span>
          <h2 className="text-lg font-bold uppercase leading-none text-gray-scale-700 md:text-xl lg:text-2xl">
            COTAÇÃO AO VIVO
          </h2>
        </div>
        <a href="/jogo-do-bicho/cotacao" className="flex min-w-[84px] items-center gap-2 text-base text-blue underline">
          Ver todos
        </a>
      </div>

      <Swiper
        modules={[Navigation, Autoplay]}
        spaceBetween={16}
        slidesPerView="auto"
        navigation
        autoplay={{ delay: 2500, disableOnInteraction: false }}
        className="w-full"
        loop
      >
        {quotations.map((q) => (
          <SwiperSlide key={q.id} className="!w-[240px] md:!w-[260px]">
            <div className="flex h-full flex-col items-center justify-between rounded-2xl bg-gradient-to-br from-blue via-blue-scale-70 to-blue-scale-100 px-4 py-6 shadow-lg border border-yellow/30">
              <p className="mb-4 text-center text-lg font-bold text-white">{q.name}</p>
              <p className="mb-4 text-center text-xl font-extrabold text-yellow">{q.value}</p>
              <a
                href="/jogo-do-bicho/cotacao"
                className="w-full rounded-lg bg-yellow px-4 py-2 text-center text-base font-bold text-blue-950 hover:bg-yellow/90 transition-colors"
              >
                JOGAR
              </a>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  )
}
