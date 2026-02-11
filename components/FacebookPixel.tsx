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

        // Verificar se script já existe
        const existingScript = document.getElementById('facebook-pixel-script')
        if (existingScript) {
          console.log('⚠️ FacebookPixel: Script já existe, removendo...')
          existingScript.remove()
        }

        // Verificar se já existe fbq global (pode ter sido carregado por outro script)
        if (window.fbq && typeof window.fbq === 'function' && (window.fbq as any).loaded) {
          console.log('✅ FacebookPixel: fbq já existe e está carregado, usando...')
          try {
            window.fbq('init', pixelId)
            console.log('✅ FacebookPixel: Pixel inicializado com ID:', pixelId)
            window.fbq('track', 'PageView')
            console.log('✅ FacebookPixel: PageView rastreado')
            
            // Também enviar PageView para nossa API
            trackFacebookEvent('PageView', {
              source_url: window.location.href,
            }, pixelId)
            
            setPixelStatus('loaded')
            return
          } catch (initError) {
            console.error('❌ FacebookPixel: Erro ao inicializar com fbq existente:', initError)
          }
        }

        // Usar código padrão do Facebook para carregar o pixel
        // Isso garante compatibilidade com Pixel Helper
        if (typeof window !== 'undefined' && !window.fbq) {
          // Código padrão do Facebook Pixel
          ;(function(f: any, b: any, e: string, v: string, n?: any, t?: any, s?: any) {
            if (f.fbq) return
            n = f.fbq = function(...args: any[]) {
              n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args)
            }
            if (!f._fbq) f._fbq = n
            n.push = n
            n.loaded = false
            n.version = '2.0'
            n.queue = []
            t = b.createElement(e)
            t.async = true
            t.defer = true
            t.src = v
            t.onload = function() {
              n.loaded = true
              console.log('✅ FacebookPixel: Script fbevents.js carregado')
            }
            s = b.getElementsByTagName(e)[0]
            s.parentNode?.insertBefore(t, s)
          })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')
          
          console.log('📥 FacebookPixel: fbq queue inicializado, aguardando script carregar...')
        }

        // Aguardar script carregar e então inicializar
        const checkFbqLoaded = setInterval(() => {
          if (window.fbq && (window.fbq as any).loaded === true) {
            clearInterval(checkFbqLoaded)
            console.log('✅ FacebookPixel: Script carregado, inicializando pixel...')
            try {
              window.fbq('init', pixelId)
              console.log('✅ FacebookPixel: Pixel inicializado com ID:', pixelId)
              window.fbq('track', 'PageView')
              console.log('✅ FacebookPixel: PageView rastreado')
              
              // Também enviar PageView para nossa API
              trackFacebookEvent('PageView', {
                source_url: window.location.href,
              }, pixelId)
              
              setPixelStatus('loaded')
            } catch (initError) {
              console.error('❌ FacebookPixel: Erro ao inicializar:', initError)
              setPixelStatus('error')
            }
          }
        }, 100)

        // Timeout de segurança (10 segundos)
        setTimeout(() => {
          clearInterval(checkFbqLoaded)
          if (pixelStatus === 'loading') {
            console.warn('⚠️ FacebookPixel: Timeout ao carregar script (10s)')
            // Tentar inicializar mesmo assim se fbq existe
            if (window.fbq) {
              try {
                window.fbq('init', pixelId)
                window.fbq('track', 'PageView')
                trackFacebookEvent('PageView', {
                  source_url: window.location.href,
                }, pixelId)
                setPixelStatus('loaded')
                console.log('✅ FacebookPixel: Inicializado após timeout')
              } catch (e) {
                setPixelStatus('error')
              }
            } else {
              setPixelStatus('error')
            }
          }
        }, 10000)
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
    source_url?: string
    [key: string]: any
  },
  pixelIdOverride?: string
) {
  // Enviar para Facebook Pixel (se disponível)
  if (typeof window !== 'undefined' && window.fbq) {
    try {
      window.fbq('track', eventName, eventData || {})
      console.log(`📤 FacebookPixel: Evento "${eventName}" enviado para Facebook`)
    } catch (error) {
      console.error('Erro ao enviar evento para Facebook:', error)
    }
  }
  
  // Sempre enviar para nossa API para registro (mesmo se fbq não estiver disponível)
  const eventId = `${eventName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  // Buscar pixelId da configuração se não foi fornecido
  let pixelId = pixelIdOverride
  if (!pixelId && typeof window !== 'undefined') {
    // Tentar buscar do localStorage ou fazer fetch
    fetch('/api/tracking/config', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        pixelId = data.config?.facebookPixelId
        sendToAPI(eventName, eventId, eventData, pixelId)
      })
      .catch(() => {
        sendToAPI(eventName, eventId, eventData, null)
      })
  } else {
    sendToAPI(eventName, eventId, eventData, pixelId)
  }
}

function sendToAPI(
  eventName: string,
  eventId: string,
  eventData: any,
  pixelId: string | null | undefined
) {
  fetch('/api/facebook/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event_name: eventName,
      event_id: eventId,
      pixel_id: pixelId || null,
      custom_data: eventData || {},
      value: eventData?.value,
      currency: eventData?.currency || 'BRL',
      source_url: eventData?.source_url || (typeof window !== 'undefined' ? window.location.href : null),
    }),
  })
    .then((res) => {
      if (res.ok) {
        console.log(`✅ FacebookPixel: Evento "${eventName}" registrado na API`)
      } else {
        console.warn(`⚠️ FacebookPixel: Erro ao registrar evento na API: ${res.status}`)
        return res.json().catch(() => ({}))
      }
    })
    .then((data) => {
      if (data?.error) {
        console.warn(`⚠️ FacebookPixel: Erro da API:`, data.error)
      }
    })
    .catch((error) => {
      console.error('❌ FacebookPixel: Erro ao registrar evento no servidor:', error)
    })
}
