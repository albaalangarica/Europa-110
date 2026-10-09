import 'server-only'
import { db } from '@/lib/supabase/admin'
import type { Proposicion } from '@/lib/domain/types'

type Row = Omit<Proposicion, 'autor'> & { miembros: { nombre: string; usuario: string } | null }

export async function getProposiciones(): Promise<Proposicion[]> {
  const { data, error } = await db().from('proposiciones').select('*, miembros(nombre, usuario)').order('created_at', { ascending: false })
  // Si falta ejecutar la migración, el apartado sale vacío en vez de romper Planchas.
  if (error?.code === 'PGRST205' || error?.code === '42P01') return []
  if (error) throw error
  return (data as Row[]).map(({ miembros, ...row }) => ({ ...row, autor: miembros?.nombre || miembros?.usuario || '—' }))
}
