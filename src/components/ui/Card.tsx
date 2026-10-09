import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('card', className)} {...props} />
}

/** Tarjeta que abre otra pantalla. Toda la superficie es pulsable. */
export function CardLink({
  href,
  className,
  children,
  chevron = true,
  ...props
}: { href: string; chevron?: boolean; children: ReactNode } & Omit<ComponentProps<typeof Link>, 'href'>) {
  return (
    <Link href={href} className={cn('card card-link flex items-center gap-3 p-4', className)} {...props}>
      <div className="min-w-0 flex-1">{children}</div>
      {chevron ? <ChevronRight aria-hidden className="size-5 shrink-0 text-faint" strokeWidth={1.75} /> : null}
    </Link>
  )
}
