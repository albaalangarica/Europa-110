'use server'

import { randomBytes, randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/lib/supabase/admin'
import { avisoDeFormacion, avisosDeTenida } from '@/lib/data/avisos'
import { ENTITIES, isEntityKey, type FieldDef } from '@/lib/admin/entities'
import { toIsoDate } from '@/lib/domain/dates'
import { parseGrade } from '@/lib/domain/permissions'
import { normalizeText } from '@/lib/domain/text'
import type { ActionResult } from '@/lib/domain/types'
import { actionMember, failure, NOT_AUTHENTICATED, success, text, UNEXPECTED } from './helpers'

const NO_PERMISSION = failure('Solo Administración puede editar contenidos.')

async function adminOnly(): Promise<ActionResult | null> {
  const member = await actionMember()
  if (!member) return NOT_AUTHENTICATED
  if (!member.permisos.administracion) return NO_PERMISSION
  return null
}

function readField(field: FieldDef, form: FormData): { value?: unknown; error?: string } {
  const raw = String(form.get(field.name) ?? '').trim()
  switch (field.type) {
    case 'checkbox':
      return { value: form.get(field.name) === 'on' }
    case 'date': {
      if (!raw) return field.required ? { error: `${field.label}: obligatoria.` } : { value: null }
      const iso = toIsoDate(raw)
      return iso ? { value: iso } : { error: `${field.label}: fecha no válida.` }
    }
    case 'grade': {
      const grade = parseGrade(raw)
      return grade ? { value: grade } : { error: `${field.label}: elige Aprendiz, Compañero o Maestro.` }
    }
    case 'url':
      if (raw && !/^https?:\/\//i.test(raw)) return { error: `${field.label}: el enlace debe empezar por http:// o https://` }
      return { value: raw.slice(0, 2000) }
    case 'lines': {
      const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
      if (lines.some((l) => !/^https?:\/\//i.test(l))) return { error: `${field.label}: cada enlace debe empezar por http:// o https://` }
      return { value: lines }
    }
    case 'tenida':
      return { value: raw || null }
    case 'select':
      if (!field.options?.includes(raw)) return { error: `${field.label}: elige una opción.` }
      return { value: raw }
    default:
      if (field.required && !raw) return { error: `${field.label}: obligatorio.` }
      return { value: raw.slice(0, field.type === 'textarea' ? 20000 : 500) }
  }
}

export async function saveEntity(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const denied = await adminOnly()
  if (denied) return denied

  const kind = text(form, '_kind', 40)
  if (!isEntityKey(kind)) return failure('Tipo de contenido no válido.')
  const def = ENTITIES[kind]
  const existingId = text(form, '_id', 120)

  const row: Record<string, unknown> = {}
  for (const field of def.fields) {
    const { value, error } = readField(field, form)
    if (error) return failure(error)
    row[field.name] = value
  }

  let id = existingId
  if (!id) {
    const year = String((row.fecha as string) || new Date().toISOString()).slice(0, 4)
    id = `${def.idPrefix}-${year}-${randomBytes(3).toString('hex').toUpperCase()}`
  }
  if (kind !== 'formaciones') row.updated_at = new Date().toISOString()

  // Para avisar si se añade el orden del día o la convocatoria.
  const before = kind === 'tenidas' && existingId ? (await db().from('tenidas').select('*').eq('id', existingId).maybeSingle()).data : null

  try {
    const query = existingId
      ? db().from(def.table).update(row).eq('id', existingId)
      : db().from(def.table).insert({ ...row, id })
    const { error } = await query
    if (error) throw error
  } catch (error) {
    console.error('[admin guardar]', kind, error)
    return UNEXPECTED
  }

  const member = await actionMember()
  if (member && kind === 'tenidas') {
    const { data: after } = await db().from('tenidas').select('*').eq('id', id).maybeSingle()
    if (after) await avisosDeTenida(existingId ? (before ?? {}) : null, after, member.id)
  }
  if (member && kind === 'formaciones' && !existingId && row.activo !== false) {
    await avisoDeFormacion({ id, nivel: row.nivel as 'Compañero' | 'Aprendiz', titulo: String(row.titulo), fecha: (row.fecha as string) || null, hora: String(row.hora ?? '') }, member.id)
  }

  revalidatePath('/', 'layout')
  if (!existingId) redirect(`/admin/${kind}/${encodeURIComponent(id)}?guardado=1`)
  return success('Cambios guardados.')
}

export async function deleteEntity(kind: string, id: string): Promise<ActionResult> {
  const denied = await adminOnly()
  if (denied) return denied
  if (!isEntityKey(kind)) return failure('Tipo de contenido no válido.')

  try {
    const { error } = await db().from(ENTITIES[kind].table).delete().eq('id', id)
    if (error) throw error
  } catch (error) {
    console.error('[admin borrar]', kind, error)
    return UNEXPECTED
  }
  revalidatePath('/', 'layout')
  redirect(`/admin/${kind}?borrado=1`)
}

/* Miembros: además de la ficha, cada uno tiene una cuenta de acceso con contraseña. */

// Correo interno de la cuenta: nunca se usa para enviar nada, solo para identificarla.
function internalEmail(): string {
  return `m-${randomUUID()}@miembros.europa110.app`
}

export async function saveMember(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const denied = await adminOnly()
  if (denied) return denied

  const id = text(form, '_id', 80)
  const usuario = text(form, 'usuario', 60)
  const grado = parseGrade(form.get('grado'))
  const password = String(form.get('password') ?? '')

  if (!usuario) return failure('El usuario es obligatorio.')
  if (!grado) return failure('Elige el grado.')
  if (!id && !password) return failure('Pon una contraseña para la cuenta nueva.')

  const row = {
    usuario,
    nombre: text(form, 'nombre', 120) || usuario,
    grado,
    rol: text(form, 'rol', 60) || 'Miembro',
    cargos: text(form, 'cargos', 300),
    activo: form.get('activo') === 'on',
    observaciones: text(form, 'observaciones', 2000),
  }

  let createdId = ''
  try {
    const { data: others, error: listError } = await db().from('miembros').select('id, usuario')
    if (listError) throw listError
    const taken = (others as { id: string; usuario: string }[]).some((m) => m.id !== id && normalizeText(m.usuario) === normalizeText(usuario))
    if (taken) return failure('Ya hay otra persona con ese usuario.')

    if (id) {
      // Una contraseña puesta por Administración es provisional: se le pedirá que la cambie.
      const { error } = await db().from('miembros').update(password ? { ...row, debe_cambiar_clave: true } : row).eq('id', id)
      if (error) throw error
      if (password) {
        const { error: pwError } = await db().rpc('cambiar_clave', { miembro: id, clave: password })
        if (pwError) throw pwError
      }
    } else {
      // La cuenta se crea con una clave aleatoria y después se pone la elegida (sin mínimo de longitud).
      const { data, error } = await db().auth.admin.createUser({ email: internalEmail(), password: randomBytes(18).toString('base64url'), email_confirm: true })
      if (error || !data.user) throw error ?? new Error('Sin usuario')
      const { error: pwError } = await db().rpc('cambiar_clave', { miembro: data.user.id, clave: password })
      if (pwError) {
        await db().auth.admin.deleteUser(data.user.id)
        throw pwError
      }
      const { error: insertError } = await db().from('miembros').insert({ ...row, id: data.user.id, debe_cambiar_clave: true })
      if (insertError) {
        await db().auth.admin.deleteUser(data.user.id)
        throw insertError
      }
      createdId = data.user.id
    }
  } catch (error) {
    console.error('[admin miembro]', error)
    return UNEXPECTED
  }

  revalidatePath('/', 'layout')
  if (createdId) redirect(`/admin/miembros/${createdId}?guardado=1`)
  return success(password ? 'Cambios y contraseña guardados.' : 'Cambios guardados.')
}

export async function deleteGuest(id: number): Promise<ActionResult> {
  const denied = await adminOnly()
  if (denied) return denied
  const { error } = await db().from('invitados').delete().eq('id', id)
  if (error) {
    console.error('[admin invitado]', error)
    return UNEXPECTED
  }
  revalidatePath('/admin/invitados')
  return success('Inscripción eliminada.')
}
