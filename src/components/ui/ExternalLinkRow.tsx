import { ExternalLink } from 'lucide-react'
import { safeLink } from '@/lib/domain/text'

/** Enlace a un documento externo (Drive, YouTube…), con área táctil completa. */
export function ExternalLinkRow({ href, title, subtitle, action = 'Abrir' }: { href: string; title: string; subtitle?: string; action?: string }) {
  const url = safeLink(href)
  const body = (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-semibold">{title}</p>
        {subtitle ? <p className="truncate text-[13px] text-muted">{subtitle}</p> : null}
      </div>
      {url ? (
        <span className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-primary">
          {action}
          <ExternalLink aria-hidden className="size-4" strokeWidth={1.75} />
        </span>
      ) : null}
    </>
  )
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex min-h-[56px] items-center gap-3 px-4 py-2.5 hover:bg-subtle">
      {body}
    </a>
  ) : (
    <div className="flex min-h-[56px] items-center gap-3 px-4 py-2.5">{body}</div>
  )
}
