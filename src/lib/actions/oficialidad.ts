'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/supabase/admin'
import { findTenida } from '@/lib/data/agenda'
import type { ActionResult } from '@/lib/domain/types'
import { actionMember, failure, NOT_AUTHENTICATED, success, UNEXPECTED } from './helpers'

// Quién cubre un puesto en una tenida concreta. Vacío = vuelve a ser el titular.
export async function setCobertura(tenidaId: string, puestoId: string, miembroId: string): Promise<ActionResult> {
  const member = await actionMember()
  if (!member) return NOT_AUTHENTICATED
  if (!member.permisos.oficialidad) return failure('Solo Secretaría, el Venerable o Administración pueden cambiar la oficialidad.')

  try {
    if (!(await findTenida(tenidaId))) return failure('La tenida no existe.')
    const { data: puesto } = await db().from('puestos').select('id, titular_id').eq('id', puestoId).maybeSingle()
    if (!puesto) return failure('Ese puesto no existe.')

    const back = !miembroId || miembroId === puesto.titular_id
    const { error } = back
      ? await db().from('puestos_tenida').delete().eq('tenida_id', tenidaId).eq('puesto_id', puestoId)
      : await db().from('puestos_tenida').upsert({ tenida_id: tenidaId, puesto_id: puestoId, miembro_id: miembroId })
    if (error) throw error
    revalidatePath('/', 'layout')
    return success(back ? 'Vuelve a cubrirlo el titular.' : 'Puesto cubierto.')
  } catch (error) {
    console.error('[oficialidad]', error)
    return UNEXPECTED
  }
}

// Titular habitual de un puesto (Administración).
export async function setTitular(puestoId: string, miembroId: string): Promise<ActionResult> {
  const member = await actionMember()
  if (!member) return NOT_AUTHENTICATED
  if (!member.permisos.administracion) return failure('Solo Administración puede cambiar los titulares.')

  try {
    const { error } = await db().from('puestos').update({ titular_id: miembroId || null }).eq('id', puestoId)
    if (error) throw error
    revalidatePath('/', 'layout')
    return success('Titular guardado.')
  } catch (error) {
    console.error('[oficialidad titular]', error)
    return UNEXPECTED
  }
}
