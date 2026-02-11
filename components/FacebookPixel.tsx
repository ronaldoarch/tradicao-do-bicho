'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    fbq?: (...args: any[]) => void
    _fbq?: (...args: any[]) => void
  }
}

export default function FacebookPixel() {
  useEffect(() => {
    // Buscar configuração do pixel
    const loadPixel = async () => {
      try {
        const res = await fetch('/api/tracking/config', {
          cache: 'no-store',
        })
        const data = await res.json()
        
        const pixelId = data.config?.facebookPixelId
        const ativo = data.config?.ativo !== false

        if (!pixelId || !ativo) {
          return
        }

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

        // Carregar script do Facebook Pixel
        const script = document.createElement('script')
        script.id = 'facebook-pixel-script'
        script.async = true
        script.src = `https://connect.facebook.net/en_US/fbevents.js`
        
        // Remover script anterior se existir
        const existingScript = document.getElementById('facebook-pixel-script')
        if (existingScript) {
          existingScript.remove()
        }

        document.head.appendChild(script)

        // Inicializar pixel após script carregar
        script.onload = () => {
          if (typeof window !== 'undefined' && window.fbq) {
            window.fbq('init', pixelId)
            window.fbq('track', 'PageView')
          }
        }
      } catch (error) {
        console.error('Erro ao carregar Facebook Pixel:', error)
      }
    }

    loadPixel()
  }, [])

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
