import type { Metadata } from 'next'
import { UserPlus } from 'lucide-react'
import { AppHeader, Page } from '@/components/layout/AppHeader'
import { DeleteGuestButton } from '@/components/admin/GuestRow'
import { Section } from '@/components/ui/Section'
import { EmptyState } from '@/components/ui/States'
import { requireMember } from '@/lib/auth/session'
import { db } from '@/lib/supabase/admin'
import { dateTimeText, shortDate } from '@/lib/domain/dates'
import type { Invitado } from '@/lib/domain/types'

export const metadata: Metadata = { title: 'Invitados' }

type Row = Invitado & { tenidas: { titulo: string; fecha: string } | null }

export default async function GuestsAdminPage() {
  const member = await requireMember()
  const { data, error } = await db().from('invitados').select('*, tenidas(titulo, fecha)').order('created_at', { ascending: false })
  if (error) throw error
  const rows = data as Row[]

  const groups = new Map<string, { titulo: string; fecha: string; items: Row[] }>()
  for (const row of rows) {
    const g = groups.get(row.tenida_id) ?? { titulo: row.tenidas?.titulo || 'Tenida', fecha: row.tenidas?.fecha || '', items: [] }
    g.items.push(row)
    groups.set(row.tenida_id, g)
  }
  const sorted = [...groups.values()].sort((a, b) => b.fecha.localeCompare(a.fecha))

  return (
    <>
      <AppHeader title="Invitados" initial={(member.nombre || member.usuario).charAt(0).toUpperCase()} back={{ href: '/admin', label: 'Administración' }} />
      <Page>
        {sorted.length ? (
          sorted.map((g) => (
            <Section key={`${g.fecha}-${g.titulo}`} title={`${g.titulo} · ${shortDate(g.fecha)}`} aside={<span className="text-[12.5px] tabular-nums text-muted">{g.items.length}</span>}>
              <ul className="card divide-y divide-line overflow-hidden">
                {g.items.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-1.5 pl-4 pr-1.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-semibold">{r.nombre}</span>
                      <span className="block truncate text-[12.5px] text-muted">
                        {r.logia} · {dateTimeText(r.created_at)}
                      </span>
                    </span>
                    <DeleteGuestButton id={r.id} name={r.nombre} />
                  </li>
                ))}
              </ul>
            </Section>
          ))
        ) : (
          <EmptyState icon={UserPlus} title="Todavía no hay inscripciones de invitados" />
        )}
      </Page>
    </>
  )
}
