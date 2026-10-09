import type { Metadata } from 'next'
import { ScrollText } from 'lucide-react'
import { AppHeader, Page } from '@/components/layout/AppHeader'
import { PlanchasBrowser } from '@/components/library/PlanchasBrowser'
import { SacoProposiciones } from '@/components/library/SacoProposiciones'
import { EmptyState } from '@/components/ui/States'
import { Tabs } from '@/components/ui/Tabs'
import { requireMember } from '@/lib/auth/session'
import { getPlanchas } from '@/lib/data/library'
import { getProposiciones } from '@/lib/data/proposiciones'

export const metadata: Metadata = { title: 'Planchas' }

export default async function PlanchasPage({ searchParams }: PageProps<'/planchas'>) {
  const { tab } = await searchParams
  const member = await requireMember()
  const saco = tab === 'saco'
  const [planchas, proposiciones] = await Promise.all([saco ? Promise.resolve([]) : getPlanchas(member), getProposiciones()])
  const pending = proposiciones.filter((p) => !p.aprobada).length

  return (
    <>
      <AppHeader title="Planchas" initial={(member.nombre || member.usuario).charAt(0).toUpperCase()} />
      <Page>
        <div className="mb-4">
          <Tabs
            label="Planchas"
            active={saco ? 'saco' : 'planchas'}
            items={[
              { key: 'planchas', label: 'Planchas', href: '/planchas' },
              { key: 'saco', label: 'Saco de proposiciones', href: '/planchas?tab=saco', count: member.permisos.aprobarProposiciones ? pending : undefined },
            ]}
          />
        </div>
        {saco ? (
          <SacoProposiciones items={proposiciones} me={member.id} canApprove={member.permisos.aprobarProposiciones} />
        ) : planchas.length ? (
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
