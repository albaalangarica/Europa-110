import { NextResponse, type NextRequest } from 'next/server'
import { updateSupabaseSession } from '@/lib/supabase/proxy-session'

/*
 * Primera barrera de la zona privada: sin sesión no se entra en ninguna ruta interna.
 * Cada página y cada acción vuelven a comprobar en el servidor que la persona sigue activa.
 */

const PUBLIC_PATHS = ['/acceso', '/invitados']

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const { response, hasUser } = await updateSupabaseSession(request)

  if (!hasUser && !isPublic(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/acceso'
    url.search = pathname !== '/' ? `?next=${encodeURIComponent(pathname + search)}` : ''
    return NextResponse.redirect(url)
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|icons/|favicon.ico|manifest.webmanifest|sw.js|offline.html|robots.txt).*)'],
}
