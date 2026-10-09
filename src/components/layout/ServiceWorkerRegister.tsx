'use client'

import { useEffect } from 'react'

/** Registra el service worker (solo en producción para no interferir con el desarrollo). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {
      // Sin service worker la app sigue funcionando con normalidad.
    })
  }, [])
  return null
}
