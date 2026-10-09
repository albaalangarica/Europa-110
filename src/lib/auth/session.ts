import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/admin'
import { permissionsFor, type Permisos } from '@/lib/domain/permissions'
import type { Miembro } from '@/lib/domain/types'

export interface CurrentMember extends Miembro {
  permisos: Permisos
}

/*
 * Persona con sesión, leída de nuevo en cada petición: si se desactiva una cuenta,
 * deja de tener acceso en el momento (como hacía Code.gs con la hoja Usuarios).
 */
export const getCurrentMember = cache(async (): Promise<CurrentMember | null> => {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getClaims()
  const id = data?.claims?.sub
  if (!id) return null

  const { data: row } = await db().from('miembros').select('*').eq('id', id).maybeSingle()
  const member = row as Miembro | null
  if (!member || !member.activo) return null
  return { ...member, permisos: permissionsFor(member) }
})

export async function requireMember(): Promise<CurrentMember> {
  const member = await getCurrentMember()
  if (!member) redirect('/acceso?caducada=1')
  return member
}
