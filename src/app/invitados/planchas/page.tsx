import type { Metadata } from 'next'
import { ScrollText } from 'lucide-react'
import { ExternalLinkRow } from '@/components/ui/ExternalLinkRow'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { getGuestData, type GuestPlancha } from '@/lib/data/library'

export const metadata: Metadata = { title: 'Planchas · Invitados' }
export const dynamic = 'force-dynamic'

export default async function GuestPapersPage() {
  let planchas: GuestPlancha[]
  try {
    planchas = (await getGuestData()).planchas
  } catch {
    return <ErrorState />
  }
  return planchas.length ? (
    <ul className="card divide-y divide-line overflow-hidden">
      {planchas.map((p) => (
        <li key={p.id}>
          <ExternalLinkRow href={p.url} title={p.titulo} subtitle={p.autor} action="Abrir en Drive" />
        </li>
      ))}
    </ul>
  ) : (
    <EmptyState icon={ScrollText} title="No hay planchas públicas disponibles" />
  )
}
