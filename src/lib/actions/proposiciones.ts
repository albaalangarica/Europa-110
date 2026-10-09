'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/supabase/admin'
import type { ActionResult } from '@/lib/domain/types'
import { actionMember, failure, NOT_AUTHENTICATED, success, text, UNEXPECTED } from './helpers'

export async function addProposicion(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const member = await actionMember()
  if (!member) return NOT_AUTHENTICATED
  const titulo = text(form, 'titulo', 200)
  const enlace = text(form, 'enlace', 2000)
  const nota = text(form, 'nota', 2000)
  if (!titulo) return failure('Pon un título a la proposición.')
  if (!/^https?:\/\/\S+$/i.test(enlace)) return failure('Pega el enlace completo, empezando por https://')

  try {
    const { error } = await db().from('proposiciones').insert({ titulo, enlace, nota, miembro_id: member.id })
    if (error) throw error
    revalidatePath('/planchas')
    return success('Proposición enviada. Queda provisional hasta que se apruebe.')
  } catch (error) {
    console.error('[proposición]', error)
    return UNEXPECTED
  }
}

export async function approveProposicion(id: number, aprobada: boolean): Promise<ActionResult> {
  const member = await actionMember()
  if (!member) return NOT_AUTHENTICATED
  if (!member.permisos.aprobarProposiciones) return failure('Solo Secretaría, el Venerable o Administración pueden aprobarla.')
  try {
    const { error } = await db()
      .from('proposiciones')
      .update(aprobada ? { aprobada, aprobada_por: member.nombre || member.usuario, aprobada_at: new Date().toISOString() } : { aprobada, aprobada_por: '', aprobada_at: null })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/planchas')
    return success(aprobada ? 'Proposición aprobada.' : 'Vuelve a estar provisional.')
  } catch (error) {
    console.error('[proposición aprobar]', error)
    return UNEXPECTED
  }
}

// La retira quien la dejó (mientras sea provisional) o quien puede aprobar.
export async function deleteProposicion(id: number): Promise<ActionResult> {
  const member = await actionMember()
  if (!member) return NOT_AUTHENTICATED
  try {
    const { data } = await db().from('proposiciones').select('miembro_id, aprobada').eq('id', id).maybeSingle()
    if (!data) return failure('Esa proposición ya no existe.')
    const own = data.miembro_id === member.id && !data.aprobada
    if (!own && !member.permisos.aprobarProposiciones) return failure('No puedes retirar esta proposición.')
    const { error } = await db().from('proposiciones').delete().eq('id', id)
    if (error) throw error
    revalidatePath('/planchas')
    return success('Proposición retirada.')
  } catch (error) {
    console.error('[proposición borrar]', error)
    return UNEXPECTED
  }
}
