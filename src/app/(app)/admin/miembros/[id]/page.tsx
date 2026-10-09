import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AppHeader, Page } from '@/components/layout/AppHeader'
import { MemberForm } from '@/components/admin/MemberForm'
import { requireMember } from '@/lib/auth/session'
import { db } from '@/lib/supabase/admin'
import type { Miembro } from '@/lib/domain/types'

export const metadata: Metadata = { title: 'Miembro' }

export default async function MemberEditPage({ params, searchParams }: PageProps<'/admin/miembros/[id]'>) {
  const { id } = await params
  const { guardado } = await searchParams
  const member = await requireMember()

  let target: Miembro | null = null
  if (id !== 'nuevo') {
    if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
    const { data, error } = await db().from('miembros').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    if (!data) notFound()
    target = data as Miembro
  }

  return (
    <>
      <AppHeader
        title={target ? target.nombre || target.usuario : 'Nuevo miembro'}
        initial={(member.nombre || member.usuario).charAt(0).toUpperCase()}
        back={{ href: '/admin/miembros', label: 'Miembros' }}
      />
      <Page>
        <MemberForm key={target?.id ?? 'nuevo'} member={target} saved={guardado === '1'} />
        {target ? (
          <p className="mt-6 px-1 text-[12.5px] text-muted">
            Para que alguien deje de entrar, desmarca “Activo”. Su historial de asistencia se conserva.
          </p>
        ) : null}
      </Page>
    </>
  )
}
