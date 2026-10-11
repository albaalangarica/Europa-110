import type { Metadata } from 'next'
import { AppHeader, Page } from '@/components/layout/AppHeader'
import { TitularSelect } from '@/components/admin/TitularSelect'
import { EmptyState } from '@/components/ui/States'
import { requireMember } from '@/lib/auth/session'
import { getActiveMembers, getPuestos } from '@/lib/data/oficialidad'

export const metadata: Metadata = { title: 'Oficialidad' }

export default async function OficialidadAdminPage() {
  const member = await requireMember()
  const [puestos, members] = await Promise.all([getPuestos(), getActiveMembers()])
  return (
    <>
      <AppHeader title="Oficialidad" initial={(member.nombre || member.usuario).charAt(0).toUpperCase()} back={{ href: '/admin', label: 'Administración' }} />
      <Page>
        <p className="mb-4 px-1 text-[14px] text-muted">
          Titulares de cada puesto. En cada tenida, Secretaría, el Venerable o Administración pueden poner a otro hermano para cubrirlo.
        </p>
        {puestos.length ? (
          <ol className="card divide-y divide-line overflow-hidden">
            {puestos.map((p) => (
              <li key={p.id} className="grid gap-2 px-4 pb-1 pt-3 sm:grid-cols-[1fr_240px] sm:items-center">
                <p className="flex items-center gap-3">
                  <span className="grid size-6 place-items-center rounded-full bg-subtle text-[11.5px] font-semibold tabular-nums text-muted">{p.orden}</span>
                  <span className="text-[14.5px] font-semibold">{p.nombre}</span>
                </p>
                <TitularSelect puestoId={p.id} puesto={p.nombre} titularId={p.titular_id ?? ''} members={members} />
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState title="Falta preparar la oficialidad">Ejecuta en Supabase el archivo de la oficialidad.</EmptyState>
        )}
      </Page>
    </>
  )
}
