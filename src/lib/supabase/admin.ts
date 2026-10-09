import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { supabasePublicEnv, supabaseServiceRoleKey } from '@/lib/config/env'

/**
 * Cliente con la service role: ignora RLS. Las tablas no tienen políticas, así que todo el acceso
 * a datos pasa por aquí, siempre después de comprobar la sesión y los permisos en el servidor.
 * Nunca se expone al navegador.
 *
 * Sin tipos generados: cada consulta convierte sus filas a los tipos de src/lib/domain/types.ts.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Untyped = SupabaseClient<any, 'public', 'public', any>

let client: Untyped | null = null

export function db(): Untyped {
  if (!client) {
    const { url } = supabasePublicEnv()
    client = createClient(url, supabaseServiceRoleKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return client
}
