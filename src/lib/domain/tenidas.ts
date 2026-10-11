import { normalizeText } from './text'
import type { CalendarEvent } from './calendar'
import type { Respuesta, Tenida } from './types'

export function displayTitle(item: Pick<Tenida, 'titulo' | 'tipo'>): string {
  const title = String(item.titulo || '').trim()
  if (title) return title
  const type = normalizeText(item.tipo)
  if (type.includes('solst')) return 'Tenida Solsticial'
  if (type.includes('instal')) return 'Tenida de Instalación'
  return 'Tenida Ordinaria'
}

export function attendanceLabel(answer: Respuesta | ''): { tone: 'success' | 'danger' | 'pending'; text: string } {
  if (answer === 'Sí') return { tone: 'success', text: 'Asistencia confirmada' }
  if (answer === 'No') return { tone: 'danger', text: 'No asistiré' }
  return { tone: 'pending', text: 'No confirmado' }
}

// Datos de la tenida para "Añadir al calendario" (.ics y Google Calendar).
export function tenidaCalendarEvent(t: Pick<Tenida, 'id' | 'fecha' | 'hora' | 'titulo' | 'tipo' | 'lugar' | 'numero' | 'libro_presencia'>): CalendarEvent {
  return {
    uid: t.id,
    title: `${displayTitle(t)} · Europa 110`,
    date: t.fecha,
    time: t.hora,
    location: t.lugar,
    description: [t.numero ? `Tenida nº ${t.numero}` : '', t.tipo, t.libro_presencia ? `Libro de presencia: ${t.libro_presencia}` : ''].filter(Boolean).join('\n'),
  }
}
