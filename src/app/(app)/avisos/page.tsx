import type { Metadata } from 'next'
import { AppHeader, Page } from '@/components/layout/AppHeader'
import { AvisosList } from '@/components/avisos/AvisosList'
import { requireMember } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'Avisos' }

export default async function AvisosPage() {
  const member = await requireMember()
  return (
    <>
      <AppHeader title="Avisos" initial={(member.nombre || member.usuario).charAt(0).toUpperCase()} back={{ href: '/', label: 'Agenda' }} />
      <Page>
        <AvisosList />
      </Page>
    </>
  )
}
