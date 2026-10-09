import 'server-only'
import { db } from '@/lib/supabase/admin'
import type { CurrentMember } from '@/lib/auth/session'
import { daysUntil, mediumDate, todayIso } from '@/lib/domain/dates'
import { isVisibleForUser } from '@/lib/domain/permissions'
import { displayTitle } from '@/lib/domain/tenidas'
import type { Aviso, Grado, Tenida } from '@/lib/domain/types'

const WINDOW_DAYS = 45

interface StoredAviso {
  id: number
  tipo: Aviso['tipo']
  titulo: string
  cuerpo: string
  enlace: string
  grado_minimo: Grado
  visible_para: string
  nivel: 'Compañero' | 'Aprendiz' | null
  autor_id: string | null
  created_at: string
}

// Si falta ejecutar la migración, la app sigue funcionando sin avisos.
const missingTable = (code?: string) => code === 'PGRST205' || code === '42P01'

// Momento (aprox. 9:00 en España) en que empieza un aviso calculado.
const morningOf = (iso: string) => new Date(`${iso}T07:00:00Z`).toISOString()

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Avisos de la persona, del más reciente al más antiguo, y cuántos no ha visto. */
export async function getAvisos(member: CurrentMember): Promise<{ items: Aviso[]; unread: number }> {
  const since = new Date(Date.now() - WINDOW_DAYS * 86400000).toISOString()
  const today = todayIso()

  const [stored, tenidas, answers] = await Promise.all([
    db().from('avisos').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(80),
    db().from('tenidas').select('*').gte('fecha', today).lte('fecha', addDays(today, 10)),
    db().from('asistencia').select('tenida_id').eq('miembro_id', member.id),
  ])
  if (stored.error && !missingTable(stored.error.code)) throw stored.error
  if (tenidas.error) throw tenidas.error
  if (answers.error) throw answers.error

  const levels = member.permisos.formacion.ver
  const items: Aviso[] = ((stored.data ?? []) as StoredAviso[])
    .filter((a) => a.autor_id !== member.id)
    .filter((a) => (a.nivel ? levels.includes(a.nivel) : isVisibleForUser(a, member)))
    .map((a) => ({ id: `a${a.id}`, tipo: a.tipo, titulo: a.titulo, cuerpo: a.cuerpo, enlace: a.enlace, fecha: a.created_at }))

  // Asistencia: se abre la confirmación (10 días antes) y recordatorio (3 días antes) si no ha respondido.
  const answered = new Set((answers.data as { tenida_id: string }[]).map((r) => r.tenida_id))
  const now = new Date().toISOString()
  for (const t of (tenidas.data as Tenida[]).filter((t) => isVisibleForUser(t, member) && !answered.has(t.id))) {
    const title = displayTitle(t)
    const link = `/tenidas/${encodeURIComponent(t.id)}`
    const opened = morningOf(addDays(t.fecha, -10))
    items.push({
      id: `asis-${t.id}`,
      tipo: 'asistencia',
      titulo: `Ya puedes confirmar tu asistencia a ${title}`,
      cuerpo: 'La confirmación está abierta. Toca para responder.',
      enlace: link,
      fecha: opened < now ? opened : now,
    })
    const remind = morningOf(addDays(t.fecha, -3))
    if (daysUntil(t.fecha, today) <= 3 && remind <= now) {
      items.push({
        id: `rec-${t.id}`,
        tipo: 'recordatorio',
        titulo: `Recordatorio: ${title}`,
        cuerpo: 'Todavía no has confirmado si asistirás.',
        enlace: link,
        fecha: remind,
      })
    }
  }

  items.sort((a, b) => b.fecha.localeCompare(a.fecha))
  const seen = member.avisos_vistos_at ?? ''
  return { items: items.slice(0, 50), unread: items.filter((a) => a.fecha > seen).length }
}

export async function markAvisosSeen(memberId: string): Promise<void> {
  const { error } = await db().from('miembros').update({ avisos_vistos_at: new Date().toISOString() }).eq('id', memberId)
  if (error && error.code !== 'PGRST204') throw error
}

/* Creación de avisos. Nunca hacen fallar la acción que los provoca. */

type NewAviso = Omit<StoredAviso, 'id' | 'created_at' | 'grado_minimo' | 'visible_para' | 'nivel' | 'autor_id'> &
  Partial<Pick<StoredAviso, 'grado_minimo' | 'visible_para' | 'nivel' | 'autor_id'>>

export async function createAviso(aviso: NewAviso): Promise<void> {
  try {
    const { error } = await db().from('avisos').insert(aviso)
    if (error && !missingTable(error.code)) throw error
  } catch (error) {
    console.error('[aviso]', error)
  }
}

// Al crear o editar una tenida: nueva, orden del día añadido o convocatoria añadida.
export async function avisosDeTenida(before: Partial<Tenida> | null, after: Tenida, autorId: string): Promise<void> {
  const title = displayTitle(after)
  const base = {
    enlace: `/tenidas/${encodeURIComponent(after.id)}`,
    grado_minimo: after.grado_minimo,
    visible_para: after.visible_para,
    autor_id: autorId,
  }
  if (!before) {
    await createAviso({ ...base, tipo: 'tenida', titulo: `Nueva tenida: ${title}`, cuerpo: [mediumDate(after.fecha), after.hora, after.lugar].filter(Boolean).join(' · ') })
    return
  }
  if (!before.orden_del_dia?.trim() && after.orden_del_dia.trim()) {
    await createAviso({ ...base, tipo: 'orden', titulo: `Orden del día de ${title}`, cuerpo: 'Ya está publicado el orden del día.' })
  }
  if (!before.convocatoria?.trim() && after.convocatoria.trim()) {
    await createAviso({ ...base, tipo: 'convocatoria', titulo: `Convocatoria de ${title}`, cuerpo: 'Ya está disponible la convocatoria.' })
  }
}

const levelSlug = (nivel: string) => (nivel === 'Aprendiz' ? 'aprendiz' : 'companero')

export async function avisoDeFormacion(f: { id: string; nivel: 'Compañero' | 'Aprendiz'; titulo: string; fecha: string | null; hora?: string }, autorId: string) {
  await createAviso({
    tipo: 'formacion',
    titulo: `Nueva formación: ${f.titulo}`,
    cuerpo: f.fecha ? [mediumDate(f.fecha), f.hora].filter(Boolean).join(' · ') : 'Convocatoria de formación publicada.',
    enlace: `/formacion/${levelSlug(f.nivel)}/${encodeURIComponent(f.id)}`,
    nivel: f.nivel,
    autor_id: autorId,
  })
}

export async function avisoDeAportacion(f: { id: string; nivel: 'Compañero' | 'Aprendiz'; titulo: string }, autor: { id: string; nombre: string }, texto: string) {
  await createAviso({
    tipo: 'aportacion',
    titulo: `${autor.nombre} ha aportado en «${f.titulo}»`,
    cuerpo: texto ? (texto.length > 140 ? `${texto.slice(0, 140)}…` : texto) : 'Ha compartido un enlace.',
    enlace: `/formacion/${levelSlug(f.nivel)}/${encodeURIComponent(f.id)}`,
    nivel: f.nivel,
    autor_id: autor.id,
  })
}
