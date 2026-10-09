import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight, Plus } from 'lucide-react'
import { AppHeader, Page } from '@/components/layout/AppHeader'
import { StatusBadge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { requireMember } from '@/lib/auth/session'
import { db } from '@/lib/supabase/admin'
import { dateTimeText } from '@/lib/domain/dates'
import { GRADE_LABEL } from '@/lib/domain/permissions'
import type { Miembro } from '@/lib/domain/types'

export const metadata: Metadata = { title: 'Miembros' }

export default async function MembersPage() {
  const member = await requireMember()
  const { data, error } = await db().from('miembros').select('*').order('usuario')
  if (error) throw error
  const members = data as Miembro[]

  return (
    <>
      <AppHeader title="Miembros" initial={(member.nombre || member.usuario).charAt(0).toUpperCase()} back={{ href: '/admin', label: 'Administración' }} />
      <Page>
        <ButtonLink href="/admin/miembros/nuevo" block className="mb-4">
          <Plus aria-hidden className="size-[18px]" strokeWidth={2} /> Nuevo miembro
        </ButtonLink>
        <ul className="card divide-y divide-line overflow-hidden">
          {members.map((m) => (
            <li key={m.id}>
              <Link href={`/admin/miembros/${m.id}`} className="flex min-h-[60px] items-center gap-3 px-4 py-2.5 hover:bg-subtle">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-semibold">{m.nombre || m.usuario}</span>
                  <span className="block truncate text-[12.5px] text-muted">
                    {[GRADE_LABEL[m.grado], m.cargos, m.ultimo_acceso ? `Último acceso ${dateTimeText(m.ultimo_acceso)}` : 'Sin acceder todavía'].filter(Boolean).join(' · ')}
                  </span>
                </span>
                {m.activo ? null : <StatusBadge tone="neutral">Inactivo</StatusBadge>}
                <ChevronRight aria-hidden className="size-4 shrink-0 text-faint" strokeWidth={1.75} />
              </Link>
            </li>
          ))}
        </ul>
      </Page>
    </>
  )
}
