'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/supabase/admin'
import { findTenida } from '@/lib/data/agenda'
import { attendanceIsOpen, isPast, toIsoDate } from '@/lib/domain/dates'
import { FORMATION_LEVELS, isVisibleForUser, type FormationLevel } from '@/lib/domain/permissions'
import { normalizeText } from '@/lib/domain/text'
import type { ActionResult, Respuesta } from '@/lib/domain/types'
import { actionMember, failure, NOT_AUTHENTICATED, success, text, UNEXPECTED } from './helpers'

function normalizeAnswer(value: unknown): Respuesta | null {
  const raw = normalizeText(value)
  if (['si', 'confirmo', 'asisto', 'confirmado'].includes(raw)) return 'Sí'
  if (['no', 'no asistire', 'ausente', 'no asisto'].includes(raw)) return 'No'
  return null
}

async function upsertAttendance(tenidaId: string, memberId: string, respuesta: Respuesta) {
  const { error } = await db()
    .from('asistencia')
    .upsert({ tenida_id: tenidaId, miembro_id: memberId, respuesta, respondido_at: new Date().toISOString() })
  if (error) throw error
}

// Cada persona confirma la suya, desde 10 días antes de la tenida.
export async function saveAttendance(tenidaId: string, answer: string): Promise<ActionResult> {
  const member = await actionMember()
  if (!member) return NOT_AUTHENTICATED
  const respuesta = normalizeAnswer(answer)
  if (!respuesta) return failure('Respuesta de asistencia no válida.')

  try {
    const tenida = await findTenida(tenidaId)
    if (!tenida) return failure('La tenida no existe.')
    if (!isVisibleForUser(tenida, member)) return failure('No tienes acceso a esta tenida.')
    if (!attendanceIsOpen(tenida.fecha)) return failure('La confirmación se abre 10 días antes de la tenida.')

    await upsertAttendance(tenida.id, member.id, respuesta)
    revalidatePath('/', 'layout')
    return success(respuesta === 'Sí' ? 'Asistencia confirmada.' : 'Ausencia registrada.')
  } catch (error) {
    console.error('[asistencia]', error)
    return UNEXPECTED
  }
}

// Secretaría marca la asistencia de otra persona, sin el límite de 10 días.
export async function saveAttendanceFor(tenidaId: string, memberId: string, answer: string): Promise<ActionResult> {
  const member = await actionMember()
  if (!member) return NOT_AUTHENTICATED
  if (!member.permisos.asistencia) return failure('No tienes permiso para marcar la asistencia de otros.')
  const respuesta = normalizeAnswer(answer)
  if (!respuesta) return failure('Respuesta de asistencia no válida.')

  try {
    const tenida = await findTenida(tenidaId)
    if (!tenida) return failure('La tenida no existe.')
    const { data: target } = await db().from('miembros').select('id, nombre, usuario').eq('id', memberId).maybeSingle()
    if (!target) return failure('Esa persona no está en la lista de miembros.')

    await upsertAttendance(tenida.id, target.id as string, respuesta)
    revalidatePath('/', 'layout')
    return success(`${target.nombre || target.usuario}: ${respuesta === 'Sí' ? 'asiste' : 'no asiste'}.`)
  } catch (error) {
    console.error('[asistencia secretaría]', error)
    return UNEXPECTED
  }
}

export async function saveTronco(tenidaId: string, rawAmount: string, rawNotes = ''): Promise<ActionResult> {
  const member = await actionMember()
  if (!member) return NOT_AUTHENTICATED
  if (!member.permisos.tronco) return failure('No tienes permiso para registrar el Tronco de la Viuda.')

  const importe = Number(String(rawAmount ?? '').trim().replace(',', '.'))
  if (!String(rawAmount ?? '').trim() || !Number.isFinite(importe) || importe < 0) return failure('Introduce un importe válido.')
  const observaciones = String(rawNotes ?? '').trim().slice(0, 500)

  try {
    const tenida = await findTenida(tenidaId)
    if (!tenida) return failure('La tenida no existe.')

    const now = new Date().toISOString()
    const { data: existing } = await db().from('tronco').select('tenida_id').eq('tenida_id', tenida.id).maybeSingle()
    const row: Record<string, unknown> = {
      tenida_id: tenida.id,
      importe: Math.round(importe * 100) / 100,
      registrado_por: member.nombre || member.usuario,
      updated_at: now,
    }
    if (!existing) row.registrado_at = now
    // Si no hay observaciones nuevas, se conservan las que hubiera.
    if (observaciones) row.observaciones = observaciones

    const { error } = await db().from('tronco').upsert(row)
    if (error) throw error
    revalidatePath('/', 'layout')
    return success('Importe guardado.')
  } catch (error) {
    console.error('[tronco]', error)
    return UNEXPECTED
  }
}

export async function publishFormation(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const member = await actionMember()
  if (!member) return NOT_AUTHENTICATED
  const publicar = member.permisos.formacion.publicar
  if (!publicar.length) return failure('No tienes permiso para publicar formaciones.')

  // Si puede publicar en varios niveles, el formulario indica cuál.
  const requested = FORMATION_LEVELS.find((level) => normalizeText(level) === normalizeText(form.get('nivel')))
  const nivel: FormationLevel = requested ?? publicar[0]!
  if (!publicar.includes(nivel)) return failure('No tienes permiso para publicar formaciones de ese grado.')

  const titulo = text(form, 'titulo', 300)
  if (!titulo) return failure('El título es obligatorio.')
  const fechaRaw = text(form, 'fecha', 20)
  const fecha = fechaRaw ? toIsoDate(fechaRaw) : ''
  if (fechaRaw && !fecha) return failure('La fecha no es válida.')

  const enlaces = form
    .getAll('enlace')
    .map((v) => String(v ?? '').trim())
    .filter(Boolean)
  if (enlaces.some((url) => !/^https?:\/\//i.test(url))) return failure('Los enlaces deben empezar por http:// o https://')

  try {
    const { error } = await db()
      .from('formaciones')
      .insert({
        nivel,
        titulo,
        fecha: fecha || null,
        hora: text(form, 'hora', 20),
        lugar: text(form, 'lugar', 300),
        nota: text(form, 'nota', 8000),
        enlaces,
        publicado_por: member.nombre || member.usuario,
      })
    if (error) throw error
    revalidatePath('/', 'layout')
    return success('Formación publicada.')
  } catch (error) {
    console.error('[formación]', error)
    return UNEXPECTED
  }
}

export async function guestSignup(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const tenidaId = text(form, 'tenidaId', 80)
  const nombre = String(form.get('nombre') ?? '').trim()
  const logia = String(form.get('logia') ?? '').trim()

  if (!tenidaId) return failure('Falta identificar la tenida.')
  if (!nombre) return failure('Escribe tu nombre.')
  if (!logia) return failure('Escribe tu logia de procedencia.')
  if (nombre.length > 120 || logia.length > 160) return failure('Los datos introducidos son demasiado largos.')

  try {
    const tenida = await findTenida(tenidaId)
    if (!tenida || !tenida.publica) return failure('La tenida no existe.')
    if (isPast(tenida.fecha)) return failure('Esta tenida ya ha pasado.')

    const { error } = await db().from('invitados').insert({ tenida_id: tenida.id, nombre, logia })
    // Evita duplicados si el mismo visitante pulsa dos veces.
    if (error?.code === '23505') return success('Ya estabas inscrito en esta tenida.')
    if (error) throw error
    return success('Inscripción registrada.')
  } catch (error) {
    console.error('[invitados]', error)
    return failure('No se pudo registrar la inscripción.')
  }
}
