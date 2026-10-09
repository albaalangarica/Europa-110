import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarDays, ChevronRight, Clock, MapPin } from 'lucide-react'
import { Tag } from '@/components/ui/Badge'
import { DateBlock } from '@/components/ui/DateBlock'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { getGuestData, type GuestTenida } from '@/lib/data/library'
import { canOpenDate, todayIso } from '@/lib/domain/dates'

export const metadata: Metadata = { title: 'Invitados' }
export const dynamic = 'force-dynamic'

export default async function GuestCalendarPage() {
  let tenidas: GuestTenida[]
  try {
    tenidas = (await getGuestData()).tenidas
  } catch {
    return <ErrorState />
  }
  const today = todayIso()
  const allDates = tenidas.map((t) => t.fecha)

  return (
    <>
      <p className="mb-4 px-1 text-[14px] text-muted">Calendario y planchas abiertas a visitantes.</p>
      {tenidas.length ? (
        <div className="grid gap-2.5">
          {tenidas.map((t) => {
            const canOpen = canOpenDate(t.fecha, allDates, today)
            const body = (
              <>
                <DateBlock iso={t.fecha} muted={t.fecha < today} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <h3 className="min-w-0 flex-1 text-[15.5px] font-semibold leading-snug">{t.titulo}</h3>
                    {t.tipo ? <Tag className="shrink-0">{t.tipo}</Tag> : null}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 text-[13px] text-muted">
                    {t.hora ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock aria-hidden className="size-3.5" strokeWidth={1.75} />
                        {t.hora}
                      </span>
                    ) : null}
                    {t.lugar ? (
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <MapPin aria-hidden className="size-3.5 shrink-0" strokeWidth={1.75} />
                        <span className="truncate">{t.lugar}</span>
                      </span>
                    ) : null}
                  </div>
                </div>
              </>
            )
            return canOpen ? (
              <Link key={t.id} href={`/invitados/tenida/${encodeURIComponent(t.id)}`} aria-label={`Abrir ${t.titulo}`} className="card card-link flex items-center gap-3.5 p-3">
                {body}
                <ChevronRight aria-hidden className="size-5 shrink-0 text-faint" strokeWidth={1.75} />
              </Link>
            ) : (
              <article key={t.id} aria-label={t.titulo} className="card flex items-center gap-3.5 p-3 opacity-70">
                {body}
              </article>
            )
          })}
        </div>
      ) : (
        <EmptyState icon={CalendarDays} title="No hay tenidas publicadas" />
      )}
    </>
  )
}
