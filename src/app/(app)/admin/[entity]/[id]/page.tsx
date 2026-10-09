import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AppHeader, Page } from '@/components/layout/AppHeader'
import { EntityForm } from '@/components/admin/EntityForm'
import { ENTITIES, isEntityKey, newLabel } from '@/lib/admin/entities'
import { requireMember } from '@/lib/auth/session'
import { db } from '@/lib/supabase/admin'

export const metadata: Metadata = { title: 'Administración' }

export default async function EntityEditPage({ params, searchParams }: PageProps<'/admin/[entity]/[id]'>) {
  const { entity, id } = await params
  const { guardado } = await searchParams
  if (!isEntityKey(entity)) notFound()
  const def = ENTITIES[entity]
  const member = await requireMember()
  const isNew = id === 'nuevo'

  let row: Record<string, unknown> | null = null
  if (!isNew) {
    const { data, error } = await db().from(def.table).select('*').eq('id', decodeURIComponent(id)).maybeSingle()
    if (error) throw error
    if (!data) notFound()
    row = data as Record<string, unknown>
  }

  let tenidas: { id: string; label: string }[] = []
  if (def.fields.some((f) => f.type === 'tenida')) {
    const { data, error } = await db().from('tenidas').select('id, fecha, titulo, numero').order('fecha', { ascending: false })
    if (error) throw error
    tenidas = (data as { id: string; fecha: string; titulo: string; numero: string }[]).map((t) => ({
      id: t.id,
      label: `${t.fecha} · ${t.titulo || 'Tenida'}${t.numero ? ` (nº ${t.numero})` : ''}`,
    }))
  }

  return (
    <>
      <AppHeader
        title={isNew ? newLabel(def) : def.title(row!)}
        initial={(member.nombre || member.usuario).charAt(0).toUpperCase()}
        back={{ href: `/admin/${entity}`, label: def.label }}
      />
      <Page>
        {row ? <p className="mb-4 px-1 text-[12.5px] tabular-nums text-muted">ID {String(row.id)}</p> : null}
        <EntityForm key={String(row?.id ?? 'nuevo')} kind={entity} row={row} tenidas={tenidas} saved={guardado === '1'} />
      </Page>
    </>
  )
}
