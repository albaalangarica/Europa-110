import { getCurrentMember } from '@/lib/auth/session'
import { getAvisos, markAvisosSeen } from '@/lib/data/avisos'

// Avisos de la persona con sesión. La app lo consulta cada poco mientras está abierta.
export async function GET() {
  const member = await getCurrentMember()
  if (!member) return Response.json({ items: [], unread: 0 }, { status: 401 })
  try {
    return Response.json(await getAvisos(member), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[avisos]', error)
    return Response.json({ items: [], unread: 0 }, { status: 500 })
  }
}

// Marca todos como vistos (al abrir la lista de avisos).
export async function POST() {
  const member = await getCurrentMember()
  if (!member) return new Response(null, { status: 401 })
  await markAvisosSeen(member.id)
  return new Response(null, { status: 204 })
}
