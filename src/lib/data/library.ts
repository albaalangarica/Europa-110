import 'server-only'
import { db } from '@/lib/supabase/admin'
import { isVisibleForUser, type FormationLevel } from '@/lib/domain/permissions'
import { todayIso } from '@/lib/domain/dates'
import { buildAttendanceSummaries } from './agenda'
import type { AttendanceSummary, Documento, Formacion, Miembro, Plancha, Tenida, Tronco } from '@/lib/domain/types'

type Viewer = Pick<Miembro, 'usuario' | 'grado' | 'rol' | 'cargos'>

export async function getPlanchas(user: Viewer): Promise<Plancha[]> {
  const { data, error } = await db().from('planchas').select('*').order('fecha', { ascending: false, nullsFirst: false })
  if (error) throw error
  return (data as Plancha[]).filter((p) => isVisibleForUser(p, user))
}

export async function getDocumentos(user: Viewer): Promise<Documento[]> {
  const { data, error } = await db().from('documentos').select('*').order('fecha', { ascending: false, nullsFirst: false })
  if (error) throw error
  return (data as Documento[]).filter((d) => isVisibleForUser(d, user))
}

export interface TroncoRow extends Tronco {
  titulo: string
  fecha: string
}

export interface ManagementData {
  unreadPapers: Plancha[]
  attendance: AttendanceSummary[]
  tronco: TroncoRow[]
}

export async function getManagementData(): Promise<ManagementData> {
  // Confirmaciones de las tenidas desde hace 30 días en adelante.
  const t = new Date(`${todayIso()}T00:00:00Z`)
  t.setUTCDate(t.getUTCDate() - 30)
  const from = t.toISOString().slice(0, 10)

  const [papers, tenidas, tronco] = await Promise.all([
    // Una plancha está "sin leer" mientras no se asigne a ninguna tenida.
    db().from('planchas').select('*').is('tenida_id', null).order('fecha'),
    db().from('tenidas').select('*').gte('fecha', from).order('fecha'),
    db().from('tronco').select('*, tenidas(titulo, fecha)'),
  ])
  if (papers.error) throw papers.error
  if (tenidas.error) throw tenidas.error
  if (tronco.error) throw tronco.error

  type Joined = Tronco & { tenidas: { titulo: string; fecha: string } | null }
  return {
    unreadPapers: papers.data as Plancha[],
    attendance: await buildAttendanceSummaries(tenidas.data as Tenida[]),
    tronco: (tronco.data as Joined[])
      .map(({ tenidas: tenida, ...row }) => ({
        ...row,
        importe: Number(row.importe),
        titulo: tenida?.titulo || 'Tenida',
        fecha: tenida?.fecha || '',
      }))
      .sort((a, b) => b.fecha.localeCompare(a.fecha)),
  }
}

export async function getFormations(levels: FormationLevel[]): Promise<Formacion[]> {
  if (!levels.length) return []
  const { data, error } = await db().from('formaciones').select('*').eq('activo', true).in('nivel', levels).order('publicado_at')
  if (error) throw error
  return data as Formacion[]
}

export async function findFormation(id: string): Promise<Formacion | null> {
  const { data, error } = await db().from('formaciones').select('*').eq('id', id).eq('activo', true).maybeSingle()
  if (error) throw error
  return data as Formacion | null
}

/* Zona de invitados: solo datos pensados para visitantes, nunca el orden del día ni documentos internos. */

export interface GuestPlancha {
  id: string
  tenidaId: string
  titulo: string
  autor: string
  url: string
}

export interface GuestTenida {
  id: string
  fecha: string
  titulo: string
  tipo: string
  hora: string
  lugar: string
  convocatoria: string
  planchas: GuestPlancha[]
}

export async function getGuestData(): Promise<{ tenidas: GuestTenida[]; planchas: GuestPlancha[] }> {
  const [tenidas, planchas] = await Promise.all([
    db().from('tenidas').select('id, fecha, titulo, tipo, hora, lugar, convocatoria_invitados').eq('publica', true).order('fecha'),
    db().from('planchas').select('id, tenida_id, titulo, autor, enlace').eq('publica', true).order('fecha'),
  ])
  if (tenidas.error) throw tenidas.error
  if (planchas.error) throw planchas.error

  const papers: GuestPlancha[] = (planchas.data as Pick<Plancha, 'id' | 'tenida_id' | 'titulo' | 'autor' | 'enlace'>[]).map((p) => ({
    id: p.id,
    tenidaId: p.tenida_id ?? '',
    titulo: p.titulo || 'Plancha',
    autor: p.autor,
    url: /^https?:\/\//i.test(p.enlace) ? p.enlace : '',
  }))

  return {
    tenidas: (tenidas.data as Pick<Tenida, 'id' | 'fecha' | 'titulo' | 'tipo' | 'hora' | 'lugar' | 'convocatoria_invitados'>[]).map((t) => ({
      id: t.id,
      fecha: t.fecha,
      titulo: t.titulo || 'Tenida',
      tipo: t.tipo,
      hora: t.hora,
      lugar: t.lugar,
      convocatoria: /^https?:\/\//i.test(t.convocatoria_invitados) ? t.convocatoria_invitados : '',
      planchas: papers.filter((p) => p.tenidaId === t.id),
    })),
    planchas: papers,
  }
}
