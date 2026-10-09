import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type Tone = 'success' | 'neutral' | 'danger' | 'pending'

const TONES: Record<Tone, string> = {
  success: 'bg-selected text-primary',
  neutral: 'bg-subtle text-muted',
  danger: 'bg-danger-soft text-danger',
  pending: 'bg-warning-soft text-warning',
}

const DOTS: Record<Tone, string> = {
  success: 'bg-primary',
  neutral: 'bg-faint',
  danger: 'bg-danger',
  pending: 'bg-warning',
}

/** Estado con punto de color: asistencia, pendiente, etc. */
export function StatusBadge({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold leading-none', TONES[tone], className)}>
      <span aria-hidden className={cn('size-1.5 rounded-full', DOTS[tone])} />
      {children}
    </span>
  )
}

/** Etiqueta discreta: tipo de tenida, grado, categoría. */
export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border border-line px-2 py-0.5 text-[11.5px] font-medium text-muted', className)}>
      {children}
    </span>
  )
}
