'use client'

import { useEffect, useState } from 'react'

declare global {
  interface Window {
    fbq?: (...args: any[]) => void
    _fbq?: (...args: any[]) => void
  }
}

export default function FacebookPixel() {
  const [pixelStatus, setPixelStatus] = useState<'loading' | 'loaded' | 'error' | 'not-configured'>('loading')
  const [mounted, setMounted] = useState(false)

  // Garantir que só executa no cliente após montagem
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Só executar após montagem no cliente
    if (!mounted || typeof window === 'undefined') {
      return
    }

    // Buscar configuração do pixel
    const loadPixel = async () => {
      try {
        console.log('🔍 FacebookPixel: Buscando configuração...')
        const res = await fetch('/api/tracking/config', {
          cache: 'no-store',
        })
        
        if (!res.ok) {
          console.error('❌ FacebookPixel: Erro ao buscar config:', res.status, res.statusText)
          return
        }
        
        const data = await res.json()
        console.log('📥 FacebookPixel: Config recebida:', {
          temConfig: !!data.config,
          temPixelId: !!data.config?.facebookPixelId,
          pixelId: data.config?.facebookPixelId ? `${data.config.facebookPixelId.substring(0, 5)}...` : null,
          ativo: data.config?.ativo,
        })
        
        const pixelId = data.config?.facebookPixelId
        const ativo = data.config?.ativo !== false

        if (!pixelId) {
          console.warn('⚠️ FacebookPixel: Pixel ID não configurado')
          setPixelStatus('not-configured')
          return
        }

        if (!ativo) {
          console.warn('⚠️ FacebookPixel: Tracking está desativado')
          setPixelStatus('not-configured')
          return
        }

        console.log('✅ FacebookPixel: Inicializando pixel:', pixelId)

        // Inicializar fbq se ainda não existe
        if (typeof window !== 'undefined' && !window.fbq) {
          const fbqQueue: any[] = []
          const fbqFn = function(...args: any[]) {
            fbqQueue.push(args)
          } as any
          fbqFn.q = fbqQueue
          fbqFn.l = Date.now()
          fbqFn.o = []
          fbqFn.p = []
          window.fbq = fbqFn
        }

        // Verificar se script já existe
        const existingScript = document.getElementById('facebook-pixel-script')
        if (existingScript) {
          console.log('⚠️ FacebookPixel: Script já existe, removendo...')
          existingScript.remove()
        }

        // Verificar se já existe fbq global (pode ter sido carregado por outro script)
        if (window.fbq && typeof window.fbq === 'function') {
          console.log('✅ FacebookPixel: fbq já existe globalmente, usando...')
          try {
            window.fbq('init', pixelId)
            console.log('✅ FacebookPixel: Pixel inicializado com ID:', pixelId)
            window.fbq('track', 'PageView')
            console.log('✅ FacebookPixel: PageView rastreado')
            setPixelStatus('loaded')
            return
          } catch (initError) {
            console.error('❌ FacebookPixel: Erro ao inicializar com fbq existente:', initError)
          }
        }

        // Carregar script do Facebook Pixel
        const script = document.createElement('script')
        script.id = 'facebook-pixel-script'
        script.async = true
        script.src = `https://connect.facebook.net/en_US/fbevents.js`
        
        // Adicionar crossorigin para evitar problemas CORS
        script.crossOrigin = 'anonymous'

        document.head.appendChild(script)
        console.log('📥 FacebookPixel: Script adicionado ao head')

        // Inicializar pixel após script carregar
        script.onload = () => {
          console.log('✅ FacebookPixel: Script carregado, inicializando...')
          if (typeof window !== 'undefined' && window.fbq) {
            try {
              window.fbq('init', pixelId)
              console.log('✅ FacebookPixel: Pixel inicializado com ID:', pixelId)
              window.fbq('track', 'PageView')
              console.log('✅ FacebookPixel: PageView rastreado')
              setPixelStatus('loaded')
            } catch (initError) {
              console.error('❌ FacebookPixel: Erro ao inicializar:', initError)
              setPixelStatus('error')
            }
          } else {
            console.error('❌ FacebookPixel: window.fbq não está disponível')
            setPixelStatus('error')
          }
        }

        script.onerror = (error) => {
          console.error('❌ FacebookPixel: Erro ao carregar script:', error)
          setPixelStatus('error')
        }
      } catch (error) {
        console.error('❌ Erro ao carregar Facebook Pixel:', error)
        setPixelStatus('error')
      }
    }

    loadPixel()
  }, [mounted])

  // Debug: mostrar status no console em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    useEffect(() => {
      if (pixelStatus === 'loaded') {
        console.log('🎯 FacebookPixel: Status = LOADED - Pixel está funcionando!')
      } else if (pixelStatus === 'not-configured') {
        console.log('⚠️ FacebookPixel: Status = NOT CONFIGURED - Configure o pixel em /admin/tracking')
      } else if (pixelStatus === 'error') {
        console.log('❌ FacebookPixel: Status = ERROR - Verifique os logs acima')
      }
    }, [pixelStatus])
  }

  return null
}

/**
 * Função helper para rastrear eventos do Facebook
 */
export function trackFacebookEvent(
  eventName: string,
  eventData?: {
    value?: number
    currency?: string
    content_name?: string
    content_ids?: string[]
    [key: string]: any
  }
) {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, eventData || {})
    
    // Também enviar para nossa API para registro
    fetch('/api/facebook/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_name: eventName,
        event_id: `${eventName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        custom_data: eventData || {},
        value: eventData?.value,
        currency: eventData?.currency || 'BRL',
      }),
    }).catch((error) => {
      console.error('Erro ao registrar evento no servidor:', error)
    })
  }
}
