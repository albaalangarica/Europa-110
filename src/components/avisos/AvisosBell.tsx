'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAvisos } from './AvisosProvider'

/** Campana con el número de avisos sin ver. */
export function AvisosBell({ className }: { className?: string }) {
  const { unread } = useAvisos()
  return (
    <Link
      href="/avisos"
      aria-label={unread ? `Avisos, ${unread} sin ver` : 'Avisos'}
      className={cn('relative grid size-tap shrink-0 place-items-center rounded-full text-deep hover:bg-subtle', className)}
    >
      <Bell aria-hidden className="size-[21px]" strokeWidth={1.75} />
      {unread ? (
        <span className="absolute right-1.5 top-1.5 grid min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[11px] font-semibold leading-[18px] text-white tabular-nums">
          {unread > 9 ? '9+' : unread}
        </span>
      ) : null}
    </Link>
  )
}
