'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import logo from '../../../public/icons/icon-192.png'
import { NAV_ICONS, isActive } from './BottomNav'
import type { NavItem } from './nav'

/** En pantallas anchas, la navegación va integrada en una barra superior horizontal. */
export function TopNav({ items, initial, name }: { items: NavItem[]; initial: string; name: string }) {
  const pathname = usePathname()
  return (
    <header className="sticky top-0 z-30 hidden border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85 md:block">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-6 px-8">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="EUROPA 110 · Agenda">
          <Image src={logo} alt="" width={32} height={32} priority className="size-8 rounded-[7px]" />
          <span className="text-[14px] font-semibold tracking-[0.16em] text-deep">EUROPA 110</span>
        </Link>
        <nav aria-label="Navegación principal" className="ml-auto">
          <ul className="flex items-center gap-1">
            {items.map((item) => {
              const Icon = NAV_ICONS[item.icon]
              const active = isActive(pathname, item)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative flex h-10 items-center gap-2 rounded-full px-3.5 text-[14px] transition-colors',
                      active ? 'bg-selected font-semibold text-primary' : 'font-medium text-muted hover:bg-subtle hover:text-ink',
                    )}
                  >
                    <Icon aria-hidden className="size-[18px]" strokeWidth={active ? 2 : 1.75} />
                    {item.label}
                    {active ? <span aria-hidden className="absolute inset-x-4 -bottom-[13px] h-[2px] rounded-full bg-primary" /> : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        <Link href="/perfil" aria-label={`Perfil de ${name}`} className="flex shrink-0 items-center gap-2.5 rounded-full py-1 pl-3 pr-1 hover:bg-subtle">
          <span className="text-[13.5px] font-medium text-ink">{name}</span>
          <span className="grid size-9 place-items-center rounded-full bg-deep text-[14px] font-semibold text-white">{initial}</span>
        </Link>
      </div>
    </header>
  )
}
