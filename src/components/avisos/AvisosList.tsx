'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { BellOff, ChevronRight } from 'lucide-react'
import { EmptyState, SkeletonList } from '@/components/ui/States'
import { AVISO_ICONS, useAvisos } from './AvisosProvider'

function when(iso: string): string {
  const d = new Date(iso)
  const diff = (Date.now() - d.getTime()) / 60000
  if (diff < 1) return 'ahora'
  if (diff < 60) return `hace ${Math.round(diff)} min`
  if (diff < 60 * 24) return `hace ${Math.round(diff / 60)} h`
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'Europe/Madrid' }).format(d)
}

/** Lista de avisos. Al abrirla, se marcan como vistos. */
export function AvisosList() {
  const { items, loaded, markSeen, unread } = useAvisos()

  useEffect(() => {
    if (loaded && unread) markSeen()
  }, [loaded, unread, markSeen])

  if (!loaded) return <SkeletonList count={4} height="h-[72px]" />
  if (!items.length)
    return (
      <EmptyState icon={BellOff} title="No hay avisos">
        Aquí aparecerán las tenidas nuevas, el orden del día, la confirmación de asistencia y las formaciones.
      </EmptyState>
    )

  return (
    <ul className="card divide-y divide-line overflow-hidden">
      {items.map((item) => {
        const Icon = AVISO_ICONS[item.tipo]
        return (
          <li key={item.id}>
            <Link href={item.enlace} className="flex min-h-[64px] items-start gap-3 px-4 py-3 hover:bg-subtle">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-selected text-primary">
                <Icon aria-hidden className="size-[18px]" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-semibold leading-snug">{item.titulo}</span>
                {item.cuerpo ? <span className="mt-0.5 line-clamp-2 block text-[13px] text-muted">{item.cuerpo}</span> : null}
                <span className="mt-1 block text-[12px] text-faint">{when(item.fecha)}</span>
              </span>
              <ChevronRight aria-hidden className="mt-2 size-4 shrink-0 text-faint" strokeWidth={1.75} />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
