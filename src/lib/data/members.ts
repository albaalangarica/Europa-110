import 'server-only'
import { db } from '@/lib/supabase/admin'
import { capitalize } from '@/lib/domain/text'

// Lista para el desplegable de acceso. Solo el nombre de usuario, nunca el nombre completo, porque es pública.
export async function getLoginUsers(): Promise<{ usuario: string; nombre: string }[]> {
  const { data, error } = await db().from('miembros').select('usuario').eq('activo', true)
  if (error) throw error
  return (data as { usuario: string }[])
    .filter((m) => m.usuario.trim())
    .map((m) => ({ usuario: m.usuario.trim(), nombre: capitalize(m.usuario.trim()) }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}
