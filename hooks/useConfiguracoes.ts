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

// Inicializar carregamento uma vez (apenas no cliente)
if (typeof window !== 'undefined' && !loadPromise) {
  loadConfiguracoesGlobal()
  
  const handleFocus = () => {
    if (!loadPromise) {
      loadConfiguracoesGlobal()
    }
  }
  window.addEventListener('focus', handleFocus)
}

export function useConfiguracoes() {
  const [configuracoes, setConfiguracoes] = useState<Configuracoes>(globalConfiguracoes)
  const [loading, setLoading] = useState(globalLoading)

  useEffect(() => {
    const listener = () => {
      setConfiguracoes(prev => {
        // Só atualizar se realmente mudou
        const configStr = JSON.stringify(globalConfiguracoes)
        const prevStr = JSON.stringify(prev)
        if (configStr !== prevStr) {
          return { ...globalConfiguracoes }
        }
        return prev
      })
      setLoading(prev => {
        if (prev !== globalLoading) {
          return globalLoading
        }
        return prev
      })
    }
    listeners.add(listener)
    
    return () => {
      listeners.delete(listener)
    }
  }, []) // Array vazio - só roda uma vez no mount

  // Retornar diretamente sem useMemo para evitar problemas com dependências
  return { configuracoes, loading }
}
