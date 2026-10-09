import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight, Inbox, Plus } from 'lucide-react'
import { AppHeader, Page } from '@/components/layout/AppHeader'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, Notice } from '@/components/ui/States'
import { ENTITIES, isEntityKey, newLabel } from '@/lib/admin/entities'
import { requireMember } from '@/lib/auth/session'
import { db } from '@/lib/supabase/admin'

export const metadata: Metadata = { title: 'Administración' }

export default async function EntityListPage({ params, searchParams }: PageProps<'/admin/[entity]'>) {
  const { entity } = await params
  const { borrado } = await searchParams
  if (!isEntityKey(entity)) notFound()
  const def = ENTITIES[entity]
  const member = await requireMember()

  const { data, error } = await db().from(def.table).select('*').order(def.order.column, { ascending: def.order.ascending, nullsFirst: false })
  if (error) throw error
  const rows = data as Record<string, unknown>[]

  return (
    <>
      <AppHeader title={def.label} initial={(member.nombre || member.usuario).charAt(0).toUpperCase()} back={{ href: '/admin', label: 'Administración' }} />
      <Page>
        <ButtonLink href={`/admin/${entity}/nuevo`} block className="mb-4">
          <Plus aria-hidden className="size-[18px]" strokeWidth={2} /> {newLabel(def)}
        </ButtonLink>
        {borrado ? (
          <div className="mb-4">
            <Notice tone="success">Borrado.</Notice>
          </div>
        ) : null}
        {rows.length ? (
          <ul className="card divide-y divide-line overflow-hidden">
            {rows.map((row) => (
              <li key={String(row.id)}>
                <Link href={`/admin/${entity}/${encodeURIComponent(String(row.id))}`} className="flex min-h-[60px] items-center gap-3 px-4 py-2.5 hover:bg-subtle">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-semibold">{def.title(row)}</span>
                    <span className="block truncate text-[12.5px] text-muted">{def.subtitle(row)}</span>
                  </span>
                  <ChevronRight aria-hidden className="size-4 shrink-0 text-faint" strokeWidth={1.75} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Inbox} title={`Todavía no hay ${def.label.toLowerCase()}`} />
        )}
      </Page>
    </>
  )
}
