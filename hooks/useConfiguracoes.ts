'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'

interface Configuracoes {
  nomePlataforma: string
  numeroSuporte: string
  emailSuporte: string
  whatsappSuporte: string
  logoSite: string
}

// Cache global para compartilhar configurações entre instâncias do hook
let globalConfiguracoes: Configuracoes = {
  nomePlataforma: 'Tradição do Bicho',
  numeroSuporte: '(00) 00000-0000',
  emailSuporte: 'suporte@tradicaodobicho.com',
  whatsappSuporte: '5500000000000',
  logoSite: '',
}
let globalLoading = true
let loadPromise: Promise<void> | null = null
let listeners: Set<() => void> = new Set()

const notifyListeners = () => {
  listeners.forEach(listener => listener())
}

const loadConfiguracoesGlobal = async () => {
  if (loadPromise) return loadPromise
  
  loadPromise = (async () => {
    if (typeof window === 'undefined') return
    
    try {
      const response = await fetch(`/api/configuracoes?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      })
      const data = await response.json()
      if (data.configuracoes) {
        globalConfiguracoes = data.configuracoes
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    } finally {
      globalLoading = false
      notifyListeners()
      loadPromise = null
    }
  })()
  
  return loadPromise
}

// Inicializar carregamento uma vez
if (typeof window !== 'undefined') {
  loadConfiguracoesGlobal()
  
  const handleFocus = () => {
    loadConfiguracoesGlobal()
  }
  window.addEventListener('focus', handleFocus)
}

export function useConfiguracoes() {
  const [, forceUpdate] = useState({})
  
  const configuracoes = useMemo(() => globalConfiguracoes, [])
  const loading = globalLoading

  useEffect(() => {
    const listener = () => {
      forceUpdate({})
    }
    listeners.add(listener)
    
    return () => {
      listeners.delete(listener)
    }
  }, [])

  return { configuracoes, loading }
}
