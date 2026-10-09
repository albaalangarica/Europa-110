import type { ReactNode } from 'react'
import { Clock, MapPin } from 'lucide-react'

/** Cabecera de una ficha: antetítulo, título, etiquetas y filas de fecha/lugar. */
export function DetailHero({
  kicker,
  title,
  tags,
  when,
  where,
  children,
}: {
  kicker: string
  title: string
  tags?: ReactNode
  when?: ReactNode
  where?: string
  children?: ReactNode
}) {
  return (
    <div className="card p-5">
      <p className="eyebrow text-primary">{kicker}</p>
      <h2 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-[-0.015em] text-ink">{title}</h2>
      {tags ? <div className="mt-2.5 flex flex-wrap gap-1.5">{tags}</div> : null}
      {when || where ? (
        <div className="mt-4 grid gap-2.5 border-t border-line pt-4 text-[14px]">
          {when ? (
            <div className="flex gap-2.5">
              <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={1.75} />
              <div className="text-ink">{when}</div>
            </div>
          ) : null}
          {where ? (
            <div className="flex gap-2.5">
              <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={1.75} />
              <div className="text-ink">{where}</div>
            </div>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  )
}

/** Bloque de una ficha con título. */
export function DetailSection({ title, children, flush }: { title: string; children: ReactNode; flush?: boolean }) {
  return (
    <section className="mt-6">
      <h3 className="eyebrow mb-2.5 px-1">{title}</h3>
      <div className={flush ? 'card overflow-hidden' : 'card p-4'}>{children}</div>
    </section>
  )
}
