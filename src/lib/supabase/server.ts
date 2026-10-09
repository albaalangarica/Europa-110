import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabasePublicEnv } from '@/lib/config/env'

/** Cliente con la sesión del usuario (cookies). Sujeto a RLS. */
export async function createSupabaseServerClient() {
  const { url, anonKey } = supabasePublicEnv()
  const cookieStore = await cookies()
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Llamado desde un Server Component: el proxy se encarga de refrescar la sesión.
        }
      },
    },
  })
}
