'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/supabase/admin'
import { findFormation } from '@/lib/data/library'
import type { CurrentMember } from '@/lib/auth/session'
import type { ActionResult } from '@/lib/domain/types'
import { actionMember, failure, NOT_AUTHENTICATED, success, UNEXPECTED } from './helpers'

/*
 * Aportaciones a una formación: las escriben y las ven quienes ven esa formación
 * (los de su grado y sus Vigilantes). Cada uno edita y borra las suyas; quien publica
 * la formación y Administración pueden quitar cualquiera.
 */

function readFields(form: FormData): { texto: string; enlace: string } | ActionResult {
  const texto = String(form.get('texto') ?? '').trim()
  const enlace = String(form.get('enlace') ?? '').trim()
  if (!texto && !enlace) return failure('Escribe una reflexión o pega un enlace.')
  if (texto.length > 4000) return failure('La reflexión es demasiado larga (máximo 4.000 caracteres).')
  if (enlace && !/^https?:\/\/\S+$/i.test(enlace)) return failure('El enlace debe empezar por http:// o https://')
  if (enlace.length > 2000) return failure('El enlace es demasiado largo.')
  return { texto, enlace }
}

async function canSee(member: CurrentMember, formacionId: string) {
  const formation = await findFormation(formacionId)
  return formation && member.permisos.formacion.ver.includes(formation.nivel) ? formation : null
}

async function loadOwn(id: number) {
  const { data } = await db().from('aportaciones').select('id, formacion_id, miembro_id').eq('id', id).maybeSingle()
  return data as { id: number; formacion_id: string; miembro_id: string } | null
}

export async function addContribution(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const member = await actionMember()
  if (!member) return NOT_AUTHENTICATED
  const fields = readFields(form)
  if ('ok' in fields) return fields

  try {
    const formation = await canSee(member, String(form.get('formacionId') ?? ''))
    if (!formation) return failure('No tienes acceso a esta formación.')
    const { error } = await db().from('aportaciones').insert({ formacion_id: formation.id, miembro_id: member.id, ...fields })
    if (error) throw error
    revalidatePath('/', 'layout')
    return success('Aportación publicada.')
  } catch (error) {
    console.error('[aportación]', error)
    return UNEXPECTED
  }
}

export async function updateContribution(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const member = await actionMember()
  if (!member) return NOT_AUTHENTICATED
  const fields = readFields(form)
  if ('ok' in fields) return fields

  try {
    const row = await loadOwn(Number(form.get('id')))
    if (!row || row.miembro_id !== member.id) return failure('Solo puedes editar tus aportaciones.')
    if (!(await canSee(member, row.formacion_id))) return failure('No tienes acceso a esta formación.')
    const { error } = await db().from('aportaciones').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', row.id)
    if (error) throw error
    revalidatePath('/', 'layout')
    return success('Aportación guardada.')
  } catch (error) {
    console.error('[aportación editar]', error)
    return UNEXPECTED
  }
}

export async function deleteContribution(id: number): Promise<ActionResult> {
  const member = await actionMember()
  if (!member) return NOT_AUTHENTICATED

  try {
    const row = await loadOwn(id)
    if (!row) return failure('Esa aportación ya no existe.')
    const formation = await canSee(member, row.formacion_id)
    const moderates = member.permisos.administracion || (formation ? member.permisos.formacion.publicar.includes(formation.nivel) : false)
    if (row.miembro_id !== member.id && !moderates) return failure('Solo puedes borrar tus aportaciones.')
    const { error } = await db().from('aportaciones').delete().eq('id', row.id)
    if (error) throw error
    revalidatePath('/', 'layout')
    return success('Aportación borrada.')
  } catch (error) {
    console.error('[aportación borrar]', error)
    return UNEXPECTED
  }
}
