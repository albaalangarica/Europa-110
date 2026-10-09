import Link from 'next/link'
import { cn } from '@/lib/cn'

/** Control segmentado con enlaces: cada pestaña tiene su propia URL. */
export function Tabs({ items, active, label }: { items: { key: string; label: string; href: string; count?: number }[]; active: string; label: string }) {
  return (
    <nav aria-label={label} className="grid grid-flow-col auto-cols-fr gap-1 rounded-[14px] bg-subtle p-1">
      {items.map((item) => {
        const current = item.key === active
        return (
          <Link
            key={item.key}
            href={item.href}
            replace
            scroll={false}
            aria-current={current ? 'page' : undefined}
            className={cn(
              'flex min-h-[40px] items-center justify-center gap-1.5 rounded-[11px] text-[14px] font-semibold transition-colors',
              current ? 'border border-line bg-surface text-ink' : 'text-muted hover:text-ink',
            )}
          >
            {item.label}
            {item.count ? <span className={cn('text-[12px] tabular-nums', current ? 'text-primary' : 'text-faint')}>{item.count}</span> : null}
          </Link>
        )
      })}
    </nav>
  )
}
