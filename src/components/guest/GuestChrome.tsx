'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, ScrollText } from 'lucide-react'
import { cn } from '@/lib/cn'
import logo from '../../../public/icons/icon-192.png'

export function GuestHeader() {
  const pathname = usePathname()
  const title = pathname.startsWith('/invitados/planchas') ? 'Planchas' : 'Calendario'
  return (
    <header className="pt-safe sticky top-0 z-20 border-b border-line bg-canvas/95 backdrop-blur supports-[backdrop-filter]:bg-canvas/85">
      <div className="mx-auto flex h-header max-w-[640px] items-center gap-3 px-gutter">
        <Image src={logo} alt="" width={30} height={30} priority className="size-[30px] rounded-[7px]" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[10.5px] font-semibold tracking-[0.18em] text-muted">EUROPA 110</p>
          <h1 className="truncate text-[17px] font-semibold tracking-[-0.01em]">{title}</h1>
        </div>
        <Link href="/acceso" className="inline-flex min-h-tap items-center rounded-control px-3 text-[14px] font-semibold text-primary hover:bg-selected">
          Retejo
        </Link>
      </div>
    </header>
  )
}

const ITEMS = [
  { href: '/invitados', label: 'Calendario', Icon: CalendarDays, match: (p: string) => p === '/invitados' || p.startsWith('/invitados/tenida') },
  { href: '/invitados/planchas', label: 'Planchas', Icon: ScrollText, match: (p: string) => p.startsWith('/invitados/planchas') },
]

export function GuestNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Navegación de invitados" className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur">
      <ul className="mx-auto grid max-w-[640px] grid-cols-2 px-1.5">
        {ITEMS.map(({ href, label, Icon, match }) => {
          const active = match(pathname)
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn('flex h-nav flex-col items-center justify-center gap-1 text-[11px] font-semibold', active ? 'text-primary' : 'text-muted hover:text-ink')}
              >
                <Icon aria-hidden className="size-[22px]" strokeWidth={active ? 2 : 1.7} />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
