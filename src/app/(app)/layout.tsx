import { BottomNav } from '@/components/layout/BottomNav'
import { navItems } from '@/components/layout/nav'
import { TopNav } from '@/components/layout/TopNav'
import { requireMember } from '@/lib/auth/session'

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const member = await requireMember()
  const items = navItems(member.permisos)
  const name = member.nombre || member.usuario
  return (
    <>
      <TopNav items={items} initial={name.charAt(0).toUpperCase()} name={name} />
      {children}
      <BottomNav items={items} />
    </>
  )
}
