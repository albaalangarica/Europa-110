import { normalizeText } from './text'
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
