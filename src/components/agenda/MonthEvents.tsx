import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { dayMonth, monthLabel } from '@/lib/domain/dates'
import type { OtraLogia } from '@/lib/domain/types'

/** Desplegable "Invitaciones y actos" de cada mes, con las convocatorias de otras logias. */
export function MonthEvents({ monthKey, events }: { monthKey: string; events: OtraLogia[] }) {
  return (
    <details className={events.length ? 'card mt-2.5 overflow-hidden' : 'mt-1.5 overflow-hidden rounded-card'}>
      <summary
        className={
          events.length
            ? 'flex min-h-tap cursor-pointer items-center gap-2 px-4 py-3 text-[14px] font-semibold text-deep hover:bg-subtle'
            : 'flex min-h-tap cursor-pointer items-center gap-2 px-4 text-[13.5px] font-medium text-muted hover:text-ink'
        }
      >
        <ChevronRight aria-hidden className="rotate-open size-4 shrink-0 text-muted transition-transform" strokeWidth={2} />
        <span className="flex-1">Invitaciones y actos de {monthLabel(monthKey)}</span>
        {events.length ? <span className="rounded-full bg-selected px-2 py-0.5 text-[12px] tabular-nums text-primary">{events.length}</span> : null}
      </summary>
      <div className={events.length ? 'border-t border-line' : 'card'}>
        {events.length ? (
          <ul className="divide-y divide-line">
            {events.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/convocatorias/${encodeURIComponent(event.id)}`}
                  aria-label={`Abrir ${event.titulo || 'Convocatoria'}`}
                  className="flex min-h-[56px] items-center gap-3 px-4 py-2.5 hover:bg-subtle"
                >
                  <span className="w-[52px] shrink-0 text-[12.5px] font-semibold uppercase tabular-nums text-muted">{dayMonth(event.fecha)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium leading-snug">{event.titulo || 'Convocatoria'}</span>
                    <span className="text-[12px] text-muted">Otra logia</span>
                  </span>
                  <ChevronRight aria-hidden className="size-4 shrink-0 text-faint" strokeWidth={1.75} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-3 text-[13.5px] text-muted">No hay invitaciones ni actos registrados este mes.</p>
        )}
      </div>
    </details>
  )
}
