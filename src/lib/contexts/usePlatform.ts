import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

export interface SafeAreaInsets {
  top: number
  bottom: number
  left: number
  right: number
}

export interface PlatformInfo {
  platform: 'ios' | 'android' | 'web' | 'unknown'
  safeAreaInsets: SafeAreaInsets
  isMobile: boolean
  isIOS: boolean
  isAndroid: boolean
  isWeb: boolean
}

// Funzione per leggere le variabili CSS safe-area-inset
function getSafeAreaInsets(): SafeAreaInsets {
  if (typeof window === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 }
  }

  // Crea un elemento temporaneo per leggere le variabili CSS
  const testEl = document.createElement('div')
  testEl.style.position = 'fixed'
  testEl.style.top = '0'
  testEl.style.left = '0'
  testEl.style.width = '1px'
  testEl.style.height = '1px'
  testEl.style.visibility = 'hidden'
  testEl.style.paddingTop = 'env(safe-area-inset-top)'
  testEl.style.paddingBottom = 'env(safe-area-inset-bottom)'
  testEl.style.paddingLeft = 'env(safe-area-inset-left)'
  testEl.style.paddingRight = 'env(safe-area-inset-right)'
  
  document.body.appendChild(testEl)
  
  const computedStyle = window.getComputedStyle(testEl)
  const insets = {
    top: parseInt(computedStyle.paddingTop) || 0,
    bottom: parseInt(computedStyle.paddingBottom) || 0,
    left: parseInt(computedStyle.paddingLeft) || 0,
    right: parseInt(computedStyle.paddingRight) || 0
  }
  
  document.body.removeChild(testEl)
  
  return insets
}

function detectPlatform(): 'ios' | 'android' | 'web' | 'unknown' {
  // Prima prova con Capacitor se disponibile
  if (Capacitor.isNativePlatform()) {
    const platform = Capacitor.getPlatform()
    if (platform === 'ios' || platform === 'android') {
      return platform
    }
  }

  // Fallback per rilevazione tramite user agent
  if (typeof window !== 'undefined' && window.navigator) {
    const userAgent = window.navigator.userAgent
    
    if (/iPad|iPhone|iPod/.test(userAgent)) {
      return 'ios'
    }
    
    if (/Android/.test(userAgent)) {
      return 'android'
    }
    
    return 'web'
  }

  return 'unknown'
}

export function usePlatform(): PlatformInfo {
  const [safeAreaInsets, setSafeAreaInsets] = useState<SafeAreaInsets>({ top: 0, bottom: 0, left: 0, right: 0 })
  const [platform] = useState(() => detectPlatform())

  useEffect(() => {
    // Leggi i safe area insets al mount e quando cambia l'orientamento
    const updateInsets = () => {
      const insets = getSafeAreaInsets()
      setSafeAreaInsets(insets)
    }

    updateInsets()

    // Ascolta i cambiamenti di orientamento
    window.addEventListener('orientationchange', updateInsets)
    window.addEventListener('resize', updateInsets)

    return () => {
      window.removeEventListener('orientationchange', updateInsets)
      window.removeEventListener('resize', updateInsets)
    }
  }, [])

  const isMobile = platform === 'ios' || platform === 'android'
  const isIOS = platform === 'ios'
  const isAndroid = platform === 'android'
  const isWeb = platform === 'web'

  return {
    platform,
    safeAreaInsets,
    isMobile,
    isIOS,
    isAndroid,
    isWeb
  }
}

// Hook semplificato per ottenere solo il padding top
export function useSafeAreaTop(): number {
  const { safeAreaInsets, isMobile } = usePlatform()
  // Su mobile, usa almeno 44px (altezza standard status bar) o il valore effettivo se maggiore
  return isMobile ? Math.max(safeAreaInsets.top, 44) : 0
}
