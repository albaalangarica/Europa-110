'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/supabase/admin'
import { periodStart } from '@/lib/data/hospitalaria'
import type { ActionResult } from '@/lib/domain/types'
import { actionMember, failure, NOT_AUTHENTICATED, success, UNEXPECTED } from './helpers'

const DENIED = failure('Solo la Hospitalaria (o Administración) lleva esta lista.')

// Marca a un hermano como contactado en este periodo, con una nota opcional. Si ya lo estaba, actualiza la nota.
export async function marcarContacto(miembroId: string, nota = ''): Promise<ActionResult> {
  const member = await actionMember()
  if (!member) return NOT_AUTHENTICATED
  if (!member.permisos.hospitalaria) return DENIED
  try {
    const since = await periodStart()
    const text = nota.trim().slice(0, 1000)
    const { data: existing } = await db()
      .from('contactos_hospitalaria')
      .select('id')
      .eq('miembro_id', miembroId)
      .gt('fecha', since)
      .limit(1)
      .maybeSingle()
    const { error } = existing
      ? await db().from('contactos_hospitalaria').update({ nota: text }).eq('id', existing.id)
      : await db().from('contactos_hospitalaria').insert({ miembro_id: miembroId, hecho_por: member.id, nota: text })
    if (error) throw error
    revalidatePath('/interno')
    return success('Guardado.')
  } catch (error) {
    console.error('[hospitalaria]', error)
    return UNEXPECTED
  }
}

// Quita la marca de este periodo (por si se marcó por error). No toca los periodos anteriores.
export async function desmarcarContacto(miembroId: string): Promise<ActionResult> {
  const member = await actionMember()
  if (!member) return NOT_AUTHENTICATED
  if (!member.permisos.hospitalaria) return DENIED
  try {
    const { error } = await db().from('contactos_hospitalaria').delete().eq('miembro_id', miembroId).gt('fecha', await periodStart())
    if (error) throw error
    revalidatePath('/interno')
    return success('Desmarcado.')
  } catch (error) {
    console.error('[hospitalaria]', error)
    return UNEXPECTED
  }
}
