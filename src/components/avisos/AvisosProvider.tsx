'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CalendarCheck, CalendarDays, GraduationCap, MessageSquareText, X, type LucideIcon } from 'lucide-react'
import type { Aviso } from '@/lib/domain/types'

/*
 * Avisos dentro de la app: mientras está abierta, cada poco se consultan los avisos y los nuevos
 * bajan desde arriba como un banner. La campana muestra cuántos quedan por ver.
 */

const POLL_MS = 45_000
const TOAST_MS = 7_000
const LAST_KEY = 'europa110_ultimo_aviso'

export const AVISO_ICONS: Record<Aviso['tipo'], LucideIcon> = {
  tenida: CalendarDays,
  orden: CalendarDays,
  convocatoria: CalendarDays,
  asistencia: CalendarCheck,
  recordatorio: Bell,
  formacion: GraduationCap,
  aportacion: MessageSquareText,
}

interface Ctx {
  items: Aviso[]
  unread: number
  loaded: boolean
  markSeen: () => void
}

const AvisosContext = createContext<Ctx>({ items: [], unread: 0, loaded: false, markSeen: () => {} })
export const useAvisos = () => useContext(AvisosContext)

function readLast(): string | null {
  try {
    return localStorage.getItem(LAST_KEY)
  } catch {
    return null
  }
}

function writeLast(value: string) {
  try {
    localStorage.setItem(LAST_KEY, value)
  } catch {
    // Sin almacenamiento local: se avisará igual mientras la pestaña siga abierta.
  }
}

export function AvisosProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Aviso[]>([])
  const [unread, setUnread] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [toasts, setToasts] = useState<Aviso[]>([])
  const last = useRef<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/avisos', { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as { items: Aviso[]; unread: number }
      setItems(data.items)
      setUnread(data.unread)
      setLoaded(true)

      const newest = data.items[0]?.fecha
      if (!newest) return
      if (last.current === null) last.current = readLast()
      // La primera vez en este dispositivo no se lanza todo lo anterior de golpe.
      if (last.current === null) {
        last.current = newest
        writeLast(newest)
        return
      }
      const fresh = data.items.filter((a) => a.fecha > last.current!).slice(0, 3)
      if (fresh.length) {
        setToasts((prev) => [...fresh.reverse(), ...prev].slice(0, 3))
        last.current = newest
        writeLast(newest)
      }
    } catch {
      // Sin conexión: se reintentará en la siguiente consulta.
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, POLL_MS)
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [load])

  const markSeen = useCallback(() => {
    setUnread(0)
    fetch('/api/avisos', { method: 'POST' }).catch(() => {})
  }, [])

  return (
    <AvisosContext.Provider value={{ items, unread, loaded, markSeen }}>
      {children}
      <Toasts items={toasts} onClose={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </AvisosContext.Provider>
  )
}

function Toasts({ items, onClose }: { items: Aviso[]; onClose: (id: string) => void }) {
  if (!items.length) return null
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-0 z-50 grid justify-items-center gap-2 px-3 pt-[calc(env(safe-area-inset-top)+10px)]">
      {items.map((item) => (
        <Toast key={item.id} item={item} onClose={() => onClose(item.id)} />
      ))}
    </div>
  )
}

function Toast({ item, onClose }: { item: Aviso; onClose: () => void }) {
  const router = useRouter()
  const Icon = AVISO_ICONS[item.tipo]
  // El temporizador no se reinicia aunque la lista de banners cambie.
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })
  useEffect(() => {
    const timer = setTimeout(() => close.current(), TOAST_MS)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div role="status" className="pointer-events-auto flex w-full max-w-[440px] items-start gap-3 rounded-card border border-line bg-surface/95 p-3 pr-1.5 shadow-[0_8px_30px_rgba(18,60,68,0.14)] backdrop-blur animate-sheet">
      <button
        type="button"
        onClick={() => {
          onClose()
          router.push(item.enlace)
        }}
        className="flex min-w-0 flex-1 items-start gap-3 text-left"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-selected text-primary">
          <Icon aria-hidden className="size-[18px]" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] font-semibold tracking-[0.14em] text-muted">EUROPA 110</span>
            <span className="text-[11px] text-faint">ahora</span>
          </span>
          <span className="mt-0.5 block text-[14px] font-semibold leading-snug text-ink">{item.titulo}</span>
          {item.cuerpo ? <span className="mt-0.5 line-clamp-2 block text-[13px] text-muted">{item.cuerpo}</span> : null}
        </span>
      </button>
      <button type="button" onClick={onClose} aria-label="Cerrar aviso" className="grid size-tap shrink-0 place-items-center rounded-full text-muted hover:bg-subtle">
        <X aria-hidden className="size-4" strokeWidth={1.75} />
      </button>
    </div>
  )
}
