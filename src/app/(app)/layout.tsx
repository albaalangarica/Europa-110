import { BottomNav } from '@/components/layout/BottomNav'
import { navItems } from '@/components/layout/nav'
import { requireMember } from '@/lib/auth/session'

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const member = await requireMember()
  return (
    <>
      {children}
      <BottomNav items={navItems(member.permisos)} />
    </>
  )
}
