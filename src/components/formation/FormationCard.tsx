import Link from 'next/link'
import { ChevronRight, Paperclip } from 'lucide-react'
import { DateBlock } from '@/components/ui/DateBlock'
import type { Formacion } from '@/lib/domain/types'

export function levelSlug(level: string): 'companero' | 'aprendiz' {
  return level === 'Aprendiz' ? 'aprendiz' : 'companero'
}

/** Formación en tarjeta compacta: fecha, título, primera línea de la nota y nº de materiales. */
export function FormationCard({ item, past }: { item: Formacion; past?: boolean }) {
  const preview = item.nota.split(/\r?\n/).find((l) => l.trim()) ?? ''
  const materials = item.enlaces.length
  return (
    <Link
      href={`/formacion/${levelSlug(item.nivel)}/${encodeURIComponent(item.id)}`}
      className="card card-link flex items-center gap-3.5 p-3"
      aria-label={`Abrir ${item.titulo}`}
    >
      {item.fecha ? (
        <DateBlock iso={item.fecha} muted={past} />
      ) : (
        <div className="grid w-[52px] shrink-0 place-items-center self-stretch rounded-control bg-subtle text-center text-[11px] font-semibold leading-tight text-muted">
          Sin
          <br />
          fecha
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug">{item.titulo || 'Formación'}</h3>
        {preview ? <p className="mt-0.5 truncate text-[13px] text-muted">{preview}</p> : null}
        {materials ? (
          <p className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary">
            <Paperclip aria-hidden className="size-3.5" strokeWidth={2} />
            {materials === 1 ? '1 material' : `${materials} materiales`}
          </p>
        ) : null}
      </div>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-faint" strokeWidth={1.75} />
    </Link>
  )
}
