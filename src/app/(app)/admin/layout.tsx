import { notFound } from 'next/navigation'
import { requireMember } from '@/lib/auth/session'

// Solo el rol Administrador entra en esta zona.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const member = await requireMember()
  if (!member.permisos.administracion) notFound()
  return children
}
