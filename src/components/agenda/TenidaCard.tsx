import Link from 'next/link'
import { ChevronRight, Clock, MapPin } from 'lucide-react'
import { DateBlock } from '@/components/ui/DateBlock'
import { StatusBadge, Tag } from '@/components/ui/Badge'
import { attendanceIsOpen } from '@/lib/domain/dates'
import { attendanceLabel, displayTitle } from '@/lib/domain/tenidas'
import type { AgendaTenida } from '@/lib/data/agenda'
import { cn } from '@/lib/cn'

/**
 * Tarjeta de tenida: fecha, título, hora, lugar, tipo y estado de asistencia.
 * Solo se abre si ya ha pasado, si es la siguiente o si falta menos de un mes.
 */
export function TenidaCard({ item, canOpen, past }: { item: AgendaTenida; canOpen: boolean; past: boolean }) {
  const title = displayTitle(item)
  const showAttendance = past || attendanceIsOpen(item.fecha)
  const status = attendanceLabel(item.miAsistencia)

  const body = (
    <>
      <DateBlock iso={item.fecha} muted={past} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <h3 className={cn('min-w-0 flex-1 text-[15.5px] font-semibold leading-snug', past && 'text-muted')}>{title}</h3>
          {item.tipo ? <Tag className="mt-px shrink-0">{item.tipo}</Tag> : null}
        </div>
        {item.hora || item.lugar ? (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-muted">
            {item.hora ? (
              <span className="inline-flex items-center gap-1">
                <Clock aria-hidden className="size-3.5" strokeWidth={1.75} />
                {item.hora}
              </span>
            ) : null}
            {item.lugar ? (
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin aria-hidden className="size-3.5 shrink-0" strokeWidth={1.75} />
                <span className="truncate">{item.lugar}</span>
              </span>
            ) : null}
          </div>
        ) : null}
        {showAttendance ? <StatusBadge tone={status.tone} className="mt-2">{status.text}</StatusBadge> : null}
      </div>
    </>
  )

  if (!canOpen) {
    return (
      <article aria-label={title} className="card flex items-center gap-3.5 p-3 opacity-70">
        {body}
      </article>
    )
  }

  return (
    <Link href={`/tenidas/${encodeURIComponent(item.id)}`} aria-label={`Abrir ${title}`} className="card card-link flex items-center gap-3.5 p-3">
      {body}
      <ChevronRight aria-hidden className="size-5 shrink-0 text-faint" strokeWidth={1.75} />
    </Link>
  )
}
