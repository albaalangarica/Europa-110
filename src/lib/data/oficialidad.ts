import 'server-only'
import { db } from '@/lib/supabase/admin'
import type { PuestoTenida, Respuesta } from '@/lib/domain/types'

const missingTable = (code?: string) => code === 'PGRST205' || code === '42P01'

interface Puesto {
  id: string
  nombre: string
  orden: number
  titular_id: string | null
}

export async function getPuestos(): Promise<Puesto[]> {
  const { data, error } = await db().from('puestos').select('*').order('orden')
  if (missingTable(error?.code)) return []
  if (error) throw error
  return data as Puesto[]
}

/**
 * Oficialidad de varias tenidas a la vez. Cada puesto lo ocupa quien lo cubre en esa tenida
 * o, si no, su titular; el estado sale de su respuesta de asistencia.
 */
export async function getOficialidad(tenidaIds: string[]): Promise<Map<string, PuestoTenida[]>> {
  const result = new Map<string, PuestoTenida[]>()
  if (!tenidaIds.length) return result

  const [puestos, coberturas, asistencia, miembros] = await Promise.all([
    getPuestos(),
    db().from('puestos_tenida').select('*').in('tenida_id', tenidaIds),
    db().from('asistencia').select('tenida_id, miembro_id, respuesta').in('tenida_id', tenidaIds),
    db().from('miembros').select('id, nombre, usuario'),
  ])
  if (!puestos.length) return result
  if (coberturas.error && !missingTable(coberturas.error.code)) throw coberturas.error
  if (asistencia.error) throw asistencia.error
  if (miembros.error) throw miembros.error

  const names = new Map((miembros.data as { id: string; nombre: string; usuario: string }[]).map((m) => [m.id, m.nombre || m.usuario]))
  const person = (id: string | null) => (id && names.has(id) ? { id, nombre: names.get(id)! } : null)
  const answers = new Map(
    (asistencia.data as { tenida_id: string; miembro_id: string; respuesta: Respuesta }[]).map((r) => [`${r.tenida_id}|${r.miembro_id}`, r.respuesta]),
  )
  type Cover = { tenida_id: string; puesto_id: string; miembro_id: string | null; invitado?: string }
  const covers = new Map(((coberturas.data ?? []) as Cover[]).map((c) => [`${c.tenida_id}|${c.puesto_id}`, c]))

  for (const tenidaId of tenidaIds) {
    result.set(
      tenidaId,
      puestos.map((p) => {
        const cover = covers.get(`${tenidaId}|${p.id}`)
        const guest = cover?.invitado?.trim() ?? ''
        // Un invitado lo pone Secretaría sabiendo que viene: cuenta como confirmado.
        if (guest) {
          return {
            id: p.id,
            nombre: p.nombre,
            orden: p.orden,
            titular: person(p.titular_id),
            persona: { id: null, nombre: guest },
            proTempore: true,
            invitado: true,
            estado: 'confirmado',
          }
        }
        const persona = person(cover?.miembro_id ?? p.titular_id)
        const answer = persona ? answers.get(`${tenidaId}|${persona.id}`) : undefined
        return {
          id: p.id,
          nombre: p.nombre,
          orden: p.orden,
          titular: person(p.titular_id),
          persona,
          proTempore: Boolean(cover?.miembro_id && cover.miembro_id !== p.titular_id),
          invitado: false,
          estado: !persona || answer === 'No' ? 'por-cubrir' : answer === 'Sí' ? 'confirmado' : 'pendiente',
        }
      }),
    )
  }
  return result
}

export async function getActiveMembers(): Promise<{ id: string; nombre: string }[]> {
  const { data, error } = await db().from('miembros').select('id, nombre, usuario').eq('activo', true)
  if (error) throw error
  return (data as { id: string; nombre: string; usuario: string }[])
    .map((m) => ({ id: m.id, nombre: m.nombre || m.usuario }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}
