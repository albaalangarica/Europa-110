import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Refresca la sesión de Supabase en cada petición y devuelve si hay usuario.
 * Se ejecuta en el proxy (antes de renderizar), por eso lee las variables directamente.
 */
export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { response, hasUser: false }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })
  // getClaims valida el JWT; no confiar en getSession() en servidor.
  const { data } = await supabase.auth.getClaims()
  return { response, hasUser: Boolean(data?.claims?.sub) }
}
