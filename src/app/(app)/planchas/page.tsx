import type { Metadata } from 'next'
import { ScrollText } from 'lucide-react'
import { AppHeader, Page } from '@/components/layout/AppHeader'
import { PlanchasBrowser } from '@/components/library/PlanchasBrowser'
import { EmptyState } from '@/components/ui/States'
import { requireMember } from '@/lib/auth/session'
import { getPlanchas } from '@/lib/data/library'

export const metadata: Metadata = { title: 'Planchas' }

export default async function PlanchasPage() {
  const member = await requireMember()
  const planchas = await getPlanchas(member)
  return (
    <>
      <AppHeader title="Planchas" initial={(member.nombre || member.usuario).charAt(0).toUpperCase()} />
      <Page>
        {planchas.length ? (
          <PlanchasBrowser items={planchas} />
        ) : (
          <EmptyState icon={ScrollText} title="Todavía no hay planchas">
            Las planchas publicadas aparecerán aquí.
          </EmptyState>
        )}
      </Page>
    </>
  )
}
