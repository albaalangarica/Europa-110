import 'server-only'
import { db } from '@/lib/supabase/admin'
import type { Aportacion } from '@/lib/domain/types'

// Si la tabla todavía no existe (falta ejecutar la migración), la formación se ve igual, sin aportaciones.
const missingTable = (code?: string) => code === 'PGRST205' || code === '42P01'

type Row = Omit<Aportacion, 'autor'> & { miembros: { nombre: string; usuario: string } | null }

export async function getContributions(formacionId: string): Promise<Aportacion[]> {
  const { data, error } = await db()
    .from('aportaciones')
    .select('*, miembros(nombre, usuario)')
    .eq('formacion_id', formacionId)
    .order('created_at')
  if (missingTable(error?.code)) return []
  if (error) throw error
  return (data as Row[]).map(({ miembros, ...row }) => ({ ...row, autor: miembros?.nombre || miembros?.usuario || '—' }))
}

// Cuántas aportaciones tiene cada formación, para las tarjetas del panel.
export async function countContributions(ids: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  if (!ids.length) return counts
  const { data, error } = await db().from('aportaciones').select('formacion_id').in('formacion_id', ids)
  if (missingTable(error?.code)) return counts
  if (error) throw error
  for (const row of data as { formacion_id: string }[]) counts.set(row.formacion_id, (counts.get(row.formacion_id) ?? 0) + 1)
  return counts
}
