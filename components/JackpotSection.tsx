'use client'

import { useState, useEffect } from 'react'

export default function JackpotSection() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  useEffect(() => {
    // Simulação de contador - você pode substituir por uma data real
    const calculateTimeLeft = () => {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(14, 0, 0, 0)

      const difference = tomorrow.getTime() - now.getTime()

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        })
      }
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatNumber = (num: number) => {
    return num.toString().padStart(2, '0')
  }

  return (
    <div className="relative mx-auto flex w-full flex-col items-center overflow-hidden rounded-[24px]">
      {/* Background decorativo */}
      <div className="hidden lg:block">
        <img
          src="/jackpot/vector.svg"
          alt="vector Design"
          className="spin absolute right-[-180px] top-[-300px] h-auto max-w-full object-contain opacity-70"
          style={{ maxWidth: '100%' }}
        />
      </div>
      <div className="block lg:hidden">
        <img
          src="/jackpot/vector.svg"
          alt="Vector Design"
          className="spin-center absolute-center pointer-events-none object-contain opacity-70"
          style={{ maxWidth: '100%' }}
        />
      </div>

      {/* Card principal */}
      <div
        className="flex h-auto w-full flex-col items-center overflow-hidden rounded-[24px] shadow-xl lg:h-[360px] lg:flex-row"
        style={{
          background: `linear-gradient(126.48deg, rgba(255, 255, 255, 0.1) 12.41%, rgba(255, 255, 255, 0) 92.98%),
            linear-gradient(180deg, #3a1aa1 -23.75%, #052370 100%)`,
        }}
      >
        {/* Conteúdo esquerdo */}
        <div className="flex flex-col justify-center px-8 py-8 lg:max-h-[325px] lg:w-[509px]">
          {/* Coins Mobile - Shapes */}
          <div className="mb-4 flex items-center justify-center lg:hidden">
            <div className="relative flex gap-2">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-lg border border-yellow-100/60"></div>
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-lg border border-yellow-100/60"></div>
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-lg border border-yellow-100/60"></div>
            </div>
          </div>

          {/* Valor do Jackpot */}
          <div className="text-left">
            <h2
              className="banner_value whitespace-nowrap text-[54px] font-extrabold leading-none text-[#FFA100] drop-shadow-sm lg:text-[70px]"
              style={{ textShadow: '0px 1px 0px rgba(0, 0, 0, 0.08)' }}
            >
              R$ 20.000,00
            </h2>
          </div>

          {/* Contador */}
          <div className="mb-6 flex flex-col gap-5" style={{ gap: '20px' }}>
            <div className="flex flex-col gap-1" style={{ gap: '5px' }}>
              <span
                className="font-sora text-sm text-white opacity-50"
                style={{ fontSize: '14px', lineHeight: '30px' }}
              >
                Próximo sorteio
              </span>
              <div className="flex items-start gap-1" style={{ gap: '5px' }}>
                {/* Dias */}
                <div className="flex flex-col items-center gap-1" style={{ gap: '5px' }}>
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/5"
                    style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <span
                      className="font-extrabold text-white"
                      style={{ fontSize: '30px', lineHeight: '48px' }}
                    >
                      {formatNumber(timeLeft.days)}
                    </span>
                  </div>
                  <span
                    className="text-xs text-white opacity-50"
                    style={{ fontSize: '14px', lineHeight: '22px' }}
                  >
                    Dia
                  </span>
                </div>

                <span
                  className="flex items-center font-extrabold text-white"
                  style={{ fontSize: '30px', lineHeight: '48px', height: '48px' }}
                >
                  :
                </span>

                {/* Horas */}
                <div className="flex flex-col items-center gap-1" style={{ gap: '5px' }}>
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/5"
                    style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <span
                      className="font-extrabold text-white"
                      style={{ fontSize: '30px', lineHeight: '48px' }}
                    >
                      {formatNumber(timeLeft.hours)}
                    </span>
                  </div>
                  <span
                    className="text-xs text-white opacity-50"
                    style={{ fontSize: '14px', lineHeight: '22px' }}
                  >
                    Horas
                  </span>
                </div>

                <span
                  className="flex items-center font-extrabold text-white"
                  style={{ fontSize: '30px', lineHeight: '48px', height: '48px' }}
                >
                  :
                </span>

                {/* Minutos */}
                <div className="flex flex-col items-center gap-1" style={{ gap: '5px' }}>
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/5"
                    style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <span
                      className="font-extrabold text-white"
                      style={{ fontSize: '30px', lineHeight: '48px' }}
                    >
                      {formatNumber(timeLeft.minutes)}
                    </span>
                  </div>
                  <span
                    className="text-xs text-white opacity-50"
                    style={{ fontSize: '14px', lineHeight: '22px' }}
                  >
                    Min
                  </span>
                </div>

                <span
                  className="flex items-center font-extrabold text-white"
                  style={{ fontSize: '30px', lineHeight: '48px', height: '48px' }}
                >
                  :
                </span>

                {/* Segundos */}
                <div className="flex flex-col items-center gap-1" style={{ gap: '5px' }}>
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/5"
                    style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <span
                      className="font-extrabold text-white"
                      style={{ fontSize: '30px', lineHeight: '48px' }}
                    >
                      {formatNumber(timeLeft.seconds)}
                    </span>
                  </div>
                  <span
                    className="text-xs text-white opacity-50"
                    style={{ fontSize: '14px', lineHeight: '22px' }}
                  >
                    Seg
                  </span>
                </div>
              </div>
            </div>

            {/* Último ganhador */}
            <div className="flex flex-col items-start gap-2" style={{ gap: '7px' }}>
              <span
                className="font-sora text-sm text-white opacity-50"
                style={{ fontSize: '14px' }}
              >
                Último ganhador (1º lugar)
              </span>
              <div className="flex gap-3 lg:items-center" style={{ gap: '10px' }}>
              <div className="flex justify-center">
                <span className="iconify i-fluent:award-24-regular text-2xl lg:text-3xl text-[#FFA100]"></span>
              </div>
                <div className="flex flex-col items-start gap-3 lg:flex-row lg:items-center" style={{ gap: '10px' }}>
                  <span
                    className="font-sora font-extrabold uppercase text-white"
                    style={{ fontSize: '22px' }}
                  >
                    Paulo S.
                  </span>
                  <div
                    className="hidden h-px w-4 rotate-90 transform bg-white lg:block"
                    style={{ width: '17px', height: '0px', border: '1px solid #ffffff' }}
                  ></div>
                  <span
                    className="font-sora font-extrabold text-[#FFA100]"
                    style={{ fontSize: '25px', lineHeight: '32px' }}
                  >
                    R$ 4.000,00
                  </span>
                </div>
              </div>
            </div>

            {/* Botão Saiba mais */}
            <a
              href="/jackpot-semanal"
              className="mt-4 flex w-full flex-row items-center justify-center gap-1 rounded-2xl border-[1.5px] border-[#FFA100] px-3 py-2 text-[#FFA100] lg:w-[142px] hover:bg-yellow/10 transition-colors"
            >
              <span className="iconify i-fluent:info-16-regular" style={{ fontSize: '18px' }}></span>
              Saiba mais
            </a>
          </div>
        </div>

        {/* Coins Desktop - Shapes */}
        <div className="hidden h-full w-full items-center justify-center lg:flex">
          <div className="inset-0 flex items-center justify-center">
            <div className="absolute flex gap-4">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-2xl border border-yellow-100/60"></div>
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-2xl border border-yellow-100/60"></div>
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-2xl border border-yellow-100/60"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
