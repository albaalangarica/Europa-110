import type { ReactNode } from 'react'
import { CircleAlert, Inbox, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Estado vacío sobrio: icono en círculo, título y una línea de contexto. */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  children,
  className,
}: {
  icon?: LucideIcon
  title: string
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('card flex flex-col items-center px-6 py-10 text-center', className)}>
      <span className="mb-4 grid size-12 place-items-center rounded-full bg-selected text-primary">
        <Icon aria-hidden className="size-[22px]" strokeWidth={1.6} />
      </span>
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {children ? <p className="mt-1 max-w-[30ch] text-[13.5px] text-muted">{children}</p> : null}
    </div>
  )
}

/** Estado vacío en línea, para listas pequeñas dentro de una tarjeta. */
export function EmptyInline({ children }: { children: ReactNode }) {
  return <p className="px-4 py-3 text-[13.5px] text-muted">{children}</p>
}

export function ErrorState({ message, action }: { message?: string; action?: ReactNode }) {
  return (
    <div role="alert" className="card flex flex-col items-center px-6 py-10 text-center">
      <span className="mb-4 grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
        <CircleAlert aria-hidden className="size-[22px]" strokeWidth={1.6} />
      </span>
      <p className="text-[15px] font-semibold">No se ha podido cargar</p>
      <p className="mt-1 max-w-[32ch] text-[13.5px] text-muted">{message || 'Comprueba la conexión e inténtalo de nuevo.'}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function Notice({ tone = 'neutral', children }: { tone?: 'neutral' | 'success' | 'danger'; children: ReactNode }) {
  const styles = {
    neutral: 'bg-subtle text-ink',
    success: 'bg-selected text-deep',
    danger: 'bg-danger-soft text-danger',
  }[tone]
  return (
    <p role={tone === 'danger' ? 'alert' : 'status'} className={cn('rounded-control px-3.5 py-2.5 text-[13.5px] font-medium', styles)}>
      {children}
    </p>
  )
}

export function SkeletonList({ count = 3, height = 'h-[84px]' }: { count?: number; height?: string }) {
  return (
    <div className="grid gap-2.5" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={cn('skeleton rounded-card', height)} />
      ))}
    </div>
  )
}
