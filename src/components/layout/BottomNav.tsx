'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, CalendarDays, FolderLock, Gavel, GraduationCap, NotebookPen, ScrollText, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { NavIcon, NavItem } from './nav'

const ICONS: Record<NavIcon, LucideIcon> = {
  agenda: CalendarDays,
  planchas: ScrollText,
  interno: FolderLock,
  secretaria: NotebookPen,
  venerable: Gavel,
  vigilante: GraduationCap,
  formacion: BookOpen,
}

function isActive(pathname: string, item: NavItem): boolean {
  return item.match.some((m) => (m === '/' ? pathname === '/' : pathname === m || pathname.startsWith(`${m}/`)))
}

/** Navegación inferior: turquesa el apartado activo, gris el resto. Respeta el área segura del iPhone. */
export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Navegación principal"
      className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85"
    >
      <ul className="mx-auto grid max-w-[640px] grid-flow-col auto-cols-fr px-1.5">
        {items.map((item) => {
          const Icon = ICONS[item.icon]
          const active = isActive(pathname, item)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-nav min-w-tap flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors',
                  active ? 'text-primary' : 'text-muted hover:text-ink',
                )}
              >
                <Icon aria-hidden className="size-[22px]" strokeWidth={active ? 2 : 1.7} />
                <span className="max-w-full truncate px-0.5">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
