import { cardDate } from '@/lib/domain/dates'
import { cn } from '@/lib/cn'

/** Día de la semana, número y mes, en una columna fija a la izquierda de cada tarjeta. */
export function DateBlock({ iso, muted }: { iso: string; muted?: boolean }) {
  const d = cardDate(iso)
  return (
    <div
      className={cn(
        'flex w-[52px] shrink-0 flex-col items-center justify-center rounded-control py-2 leading-none',
        muted ? 'bg-subtle text-muted' : 'bg-selected text-deep',
      )}
    >
      <span className="text-[10.5px] font-semibold uppercase tracking-wider opacity-80">{d.wd}</span>
      <span className="mt-1 text-[21px] font-semibold tabular-nums tracking-tight">{d.day}</span>
      <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wider opacity-80">{d.mon}</span>
    </div>
  )
}
