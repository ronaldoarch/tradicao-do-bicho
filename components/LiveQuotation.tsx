'use client'

import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Autoplay } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'

const QUOTATIONS = [
  { title: '5. Quina de Grupo', payout: '1x R$ 5.000,00' },
  { title: '9. Milhar/Centena', payout: '1x R$ 3.300,00' },
  { title: '12. Milhar Invertida', payout: '1x R$ 6.000,00' },
  { title: '8. Milhar', payout: '1x R$ 6.000,00' },
  { title: '14. Terno de Dezena', payout: '1x R$ 5.000,00' },
  { title: '4. Quadra de Grupo', payout: '1x R$ 1.000,00' },
]

export default function LiveQuotation() {
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
        {QUOTATIONS.map((q) => (
          <SwiperSlide key={q.title} className="!w-[240px] md:!w-[260px]">
            <div className="flex h-full flex-col items-center justify-between rounded-2xl bg-gradient-to-br from-blue via-blue-scale-70 to-blue-scale-100 px-4 py-6 shadow-lg border border-yellow/30">
              <p className="mb-4 text-center text-lg font-bold text-white">{q.title}</p>
              <p className="mb-4 text-center text-xl font-extrabold text-yellow">{q.payout}</p>
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
