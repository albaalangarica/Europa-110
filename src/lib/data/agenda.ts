import 'server-only'
import { db } from '@/lib/supabase/admin'
import { isVisibleForUser } from '@/lib/domain/permissions'
import type { AttendanceSummary, Miembro, OtraLogia, Plancha, Respuesta, Tenida, Tronco } from '@/lib/domain/types'

type Viewer = Pick<Miembro, 'id' | 'usuario' | 'grado' | 'rol' | 'cargos'>

export interface AgendaTenida extends Tenida {
  miAsistencia: Respuesta | ''
}

async function myAttendance(memberId: string): Promise<Map<string, Respuesta>> {
  const { data, error } = await db().from('asistencia').select('tenida_id, respuesta').eq('miembro_id', memberId)
  if (error) throw error
  return new Map((data ?? []).map((r) => [r.tenida_id as string, r.respuesta as Respuesta]))
}

export async function getAgenda(user: Viewer): Promise<{ tenidas: AgendaTenida[]; externos: OtraLogia[] }> {
  const [tenidas, externos, answers] = await Promise.all([
    db().from('tenidas').select('*').order('fecha'),
    db().from('otras_logias').select('*').order('fecha'),
    myAttendance(user.id),
  ])
  if (tenidas.error) throw tenidas.error
  if (externos.error) throw externos.error

  return {
    tenidas: (tenidas.data as Tenida[])
      .filter((t) => isVisibleForUser(t, user))
      .map((t) => ({ ...t, miAsistencia: answers.get(t.id) ?? '' })),
    externos: (externos.data as OtraLogia[]).filter((e) => isVisibleForUser(e, user)),
  }
}

export async function findTenida(id: string): Promise<Tenida | null> {
  const { data, error } = await db().from('tenidas').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data as Tenida | null
}

export async function findOtraLogia(id: string, user: Viewer): Promise<OtraLogia | null> {
  const { data, error } = await db().from('otras_logias').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  const row = data as OtraLogia | null
  return row && isVisibleForUser(row, user) ? row : null
}

export interface TenidaDetail {
  tenida: AgendaTenida
  allDates: string[]
  planchas: Plancha[]
  tronco: Tronco | null
  summary: AttendanceSummary | null
}

// Todo lo de la ficha de una tenida en una sola llamada. Null si no existe o no es visible.
export async function getTenidaDetail(id: string, user: Viewer, withSummary: boolean): Promise<TenidaDetail | null> {
  const tenida = await findTenida(id)
  if (!tenida || !isVisibleForUser(tenida, user)) return null

  const [planchas, tronco, answers, dates, summary] = await Promise.all([
    db().from('planchas').select('*').eq('tenida_id', id).order('fecha'),
    db().from('tronco').select('*').eq('tenida_id', id).maybeSingle(),
    myAttendance(user.id),
    db().from('tenidas').select('fecha, grado_minimo, visible_para'),
    withSummary ? buildAttendanceSummaries([tenida]).then((s) => s[0] ?? null) : Promise.resolve(null),
  ])
  if (planchas.error) throw planchas.error
  if (tronco.error) throw tronco.error
  if (dates.error) throw dates.error

  return {
    tenida: { ...tenida, miAsistencia: answers.get(id) ?? '' },
    allDates: (dates.data as Pick<Tenida, 'fecha' | 'grado_minimo' | 'visible_para'>[])
      .filter((t) => isVisibleForUser(t, user))
      .map((t) => t.fecha),
    planchas: (planchas.data as Plancha[]).filter((p) => isVisibleForUser(p, user)),
    tronco: tronco.data ? { ...(tronco.data as Tronco), importe: Number((tronco.data as Tronco).importe) } : null,
    summary,
  }
}

// Resumen sí / no / pendientes de cada tenida, para Secretaría y Venerable.
export async function buildAttendanceSummaries(tenidas: Tenida[]): Promise<AttendanceSummary[]> {
  if (!tenidas.length) return []
  const [members, answers] = await Promise.all([
    db().from('miembros').select('id, usuario, nombre, grado, rol, cargos, activo'),
    db().from('asistencia').select('tenida_id, miembro_id, respuesta').in('tenida_id', tenidas.map((t) => t.id)),
  ])
  if (members.error) throw members.error
  if (answers.error) throw answers.error

  const all = members.data as Miembro[]
  const byId = new Map(all.map((m) => [m.id, m]))
  const active = all.filter((m) => m.activo)
  const rows = answers.data as { tenida_id: string; miembro_id: string; respuesta: Respuesta }[]

  return tenidas.map((tenida) => {
    const answered = new Set<string>()
    const personas: AttendanceSummary['personas'] = []

    for (const row of rows.filter((r) => r.tenida_id === tenida.id)) {
      const m = byId.get(row.miembro_id)
      answered.add(row.miembro_id)
      personas.push({ id: row.miembro_id, nombre: m?.nombre || m?.usuario || '', respuesta: row.respuesta })
    }

    const pending = active.filter((m) => !answered.has(m.id) && isVisibleForUser(tenida, m))
    for (const m of pending) personas.push({ id: m.id, nombre: m.nombre || m.usuario, respuesta: '' })
    personas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

    return {
      tenidaId: tenida.id,
      titulo: tenida.titulo || 'Tenida',
      fecha: tenida.fecha,
      si: personas.filter((p) => p.respuesta === 'Sí').map((p) => p.nombre),
      no: personas.filter((p) => p.respuesta === 'No').map((p) => p.nombre),
      pendientes: pending.map((m) => m.nombre || m.usuario),
      personas,
    }
  })
}
