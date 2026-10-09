import { ExternalLink } from 'lucide-react'
import { Tag } from '@/components/ui/Badge'
import { shortDate } from '@/lib/domain/dates'
import { driveViewUrl, safeLink } from '@/lib/domain/text'

/** Tarjeta de plancha o documento: fecha y etiqueta arriba, título, datos y enlace. */
export function LibraryCard({
  fecha,
  tag,
  title,
  meta,
  summary,
  href,
  action,
}: {
  fecha: string | null
  tag?: string
  title: string
  meta?: string[]
  summary?: string
  href: string
  action: string
}) {
  const link = safeLink(driveViewUrl(href))
  return (
    <article className="card p-4">
      {fecha || tag ? (
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-[12.5px] font-medium tabular-nums text-muted">{fecha ? shortDate(fecha) : ''}</span>
          {tag ? <Tag>{tag}</Tag> : null}
        </div>
      ) : null}
      <h3 className="text-[15.5px] font-semibold leading-snug">{title || 'Sin título'}</h3>
      {meta?.filter(Boolean).map((m, i) => (
        <p key={i} className="mt-0.5 text-[13.5px] text-muted">
          {m}
        </p>
      ))}
      {summary ? <p className="mt-2 text-[14px] leading-relaxed text-ink">{summary}</p> : null}
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="-mx-1 mt-2 inline-flex min-h-tap items-center gap-1.5 px-1 text-[14px] font-semibold text-primary"
        >
          {action}
          <ExternalLink aria-hidden className="size-4" strokeWidth={1.75} />
        </a>
      ) : null}
    </article>
  )
}
