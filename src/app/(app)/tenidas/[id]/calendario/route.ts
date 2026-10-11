import { getCurrentMember } from '@/lib/auth/session'
import { findTenida } from '@/lib/data/agenda'
import { buildIcs } from '@/lib/domain/calendar'
import { isVisibleForUser } from '@/lib/domain/permissions'
import { displayTitle, tenidaCalendarEvent } from '@/lib/domain/tenidas'

// "Añadir al calendario": descarga la tenida como .ics (iPhone, Android, Outlook).
export async function GET(_request: Request, { params }: RouteContext<'/tenidas/[id]/calendario'>) {
  const { id } = await params
  const member = await getCurrentMember()
  if (!member) return new Response('Sesión caducada', { status: 401 })

  const tenida = await findTenida(decodeURIComponent(id))
  if (!tenida || !isVisibleForUser(tenida, member)) return new Response('No encontrada', { status: 404 })

  return new Response(buildIcs(tenidaCalendarEvent(tenida)), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${displayTitle(tenida).replace(/[^\w\s-]/g, '').trim() || 'tenida'}-${tenida.fecha}.ics"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
