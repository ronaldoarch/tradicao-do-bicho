'use client'

import { useEffect, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import { useConfiguracoes } from '@/hooks/useConfiguracoes'

export default function HeroBanner() {
  const [banners, setBanners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { configuracoes } = useConfiguracoes()

  useEffect(() => {
    loadBanners()
    
    // Recarrega quando a janela ganha foco
    const handleFocus = () => {
      loadBanners()
    }
    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const loadBanners = async () => {
    try {
      const response = await fetch(`/api/banners?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      })
      const data = await response.json()
      console.log('Banners carregados:', data.banners)
      if (data.banners) {
        // Sempre atualiza, mesmo que seja array vazio
        setBanners(data.banners)
      } else {
        setBanners([])
      }
    } catch (error) {
      console.error('Erro ao carregar banners:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="relative w-full overflow-hidden bg-gradient-to-br from-yellow via-yellow-400 to-yellow-300 min-h-[300px] flex items-center justify-center">
        <div className="text-gray-600">Carregando banners...</div>
      </div>
    )
  }

  if (banners.length === 0) {
    return null
  }

  return (
    <div className="relative w-full overflow-hidden">
      <Swiper
        modules={[Autoplay, Pagination]}
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
        }}
        pagination={{
          clickable: true,
          bulletClass: 'swiper-pagination-bullet !bg-white/50',
          bulletActiveClass: 'swiper-pagination-bullet-active !bg-white',
        }}
        loop={banners.length > 1}
        className="hero-banner-swiper"
      >
        {banners.map((banner) => (
          <SwiperSlide key={banner.id}>
            <div
              className="relative w-full overflow-hidden"
              style={{
                paddingTop: banner.bannerImage ? '56.25%' : '0', // 16:9 aspect ratio (9/16 = 0.5625)
                minHeight: banner.bannerImage ? '0' : '400px',
              }}
            >
              {banner.bannerImage ? (
                <img
                  src={banner.bannerImage}
                  alt={banner.title || 'Banner'}
                  className="absolute top-0 left-0 w-full h-full object-cover"
                  style={{ objectPosition: 'center center' }}
                  loading="lazy"
                />
              ) : (
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.1) 35px, rgba(255,255,255,.1) 70px), linear-gradient(to bottom right, #fbbf24, #f59e0b, #fbbf24)',
                  }}
                />
              )}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Estilos customizados para paginação */}
      <style jsx global>{`
        .hero-banner-swiper .swiper-pagination {
          bottom: 20px !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          width: auto !important;
        }
        .hero-banner-swiper .swiper-pagination-bullet {
          width: 12px !important;
          height: 12px !important;
          margin: 0 4px !important;
          opacity: 0.5 !important;
        }
        .hero-banner-swiper .swiper-pagination-bullet-active {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  )
}
