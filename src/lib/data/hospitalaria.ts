import 'server-only'
import { db } from '@/lib/supabase/admin'
import { todayIso } from '@/lib/domain/dates'

const missingTable = (code?: string) => code === 'PGRST205' || code === '42P01'

export interface ContactoItem {
  id: string
  nombre: string
  // Contacto hecho en este periodo (desde la última tenida), si lo hay.
  actual: { fecha: string; nota: string } | null
  // Último contacto anterior, para saber cuánto hace.
  anterior: string | null
}

export interface Checklist {
  desde: string | null // fecha de la última tenida
  hasta: { fecha: string; titulo: string } | null // próxima tenida
  items: ContactoItem[]
  ready: boolean
}

/** Lista de la Hospitalaria para el periodo actual: de la última tenida a la siguiente. */
export async function getChecklist(selfId: string): Promise<Checklist> {
  const today = todayIso()
  const [prev, next, members, contactos] = await Promise.all([
    db().from('tenidas').select('fecha').lt('fecha', today).order('fecha', { ascending: false }).limit(1).maybeSingle(),
    db().from('tenidas').select('fecha, titulo').gte('fecha', today).order('fecha').limit(1).maybeSingle(),
    db().from('miembros').select('id, nombre, usuario').eq('activo', true),
    db().from('contactos_hospitalaria').select('miembro_id, fecha, nota').order('fecha', { ascending: false }),
  ])
  if (members.error) throw members.error
  if (contactos.error && !missingTable(contactos.error.code)) throw contactos.error

  const desde = (prev.data as { fecha: string } | null)?.fecha ?? null
  // El periodo empieza el día siguiente a la última tenida (en la tenida ya se vieron).
  const start = desde ? `${desde}T23:59:59+02:00` : new Date(Date.now() - 30 * 86400000).toISOString()
  const startTime = new Date(start).getTime()
  const rows = (contactos.data ?? []) as { miembro_id: string; fecha: string; nota: string }[]

  const items = (members.data as { id: string; nombre: string; usuario: string }[])
    .filter((m) => m.id !== selfId)
    .map((m) => {
      const mine = rows.filter((r) => r.miembro_id === m.id)
      const current = mine.find((r) => new Date(r.fecha).getTime() > startTime) ?? null
      const before = mine.find((r) => new Date(r.fecha).getTime() <= startTime) ?? null
      return {
        id: m.id,
        nombre: m.nombre || m.usuario,
        actual: current ? { fecha: current.fecha, nota: current.nota } : null,
        anterior: before?.fecha ?? null,
      }
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  const hasta = next.data as { fecha: string; titulo: string } | null
  return { desde, hasta, items, ready: !contactos.error }
}

// Momento desde el que cuenta el periodo actual, para desmarcar solo lo de este periodo.
export async function periodStart(): Promise<string> {
  const { data } = await db().from('tenidas').select('fecha').lt('fecha', todayIso()).order('fecha', { ascending: false }).limit(1).maybeSingle()
  const desde = (data as { fecha: string } | null)?.fecha
  return desde ? new Date(`${desde}T23:59:59+02:00`).toISOString() : new Date(Date.now() - 30 * 86400000).toISOString()
}
