import { getCurrentMember } from '@/lib/auth/session'
import { findFormation } from '@/lib/data/library'
import { buildIcs } from '@/lib/domain/calendar'

// "Añadir a mi calendario": descarga la formación como .ics (iPhone, Android, Outlook).
export async function GET(_request: Request, { params }: RouteContext<'/formacion/[nivel]/[id]/calendario'>) {
  const { id } = await params
  const member = await getCurrentMember()
  if (!member) return new Response('Sesión caducada', { status: 401 })

  const item = await findFormation(decodeURIComponent(id))
  if (!item || !item.fecha || !member.permisos.formacion.ver.includes(item.nivel)) return new Response('No encontrada', { status: 404 })

  const ics = buildIcs({
    uid: item.id,
    title: `Formación: ${item.titulo}`,
    date: item.fecha,
    time: item.hora,
    location: item.lugar,
    description: [item.nota, ...item.enlaces].filter(Boolean).join('\n'),
  })
  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="formacion-${item.fecha}.ics"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
