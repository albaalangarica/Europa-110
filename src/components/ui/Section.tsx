import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Bloque con título pequeño en versalitas y contenido debajo. */
export function Section({
  title,
  aside,
  children,
  className,
}: {
  title: ReactNode
  aside?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('mt-7 first:mt-0', className)}>
      <div className="mb-2.5 flex items-baseline justify-between gap-3 px-1">
        <h2 className="eyebrow">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}
