import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { GuestSignup } from '@/components/guest/GuestSignup'
import { Tag } from '@/components/ui/Badge'
import { buttonClass } from '@/components/ui/Button'
import { DetailHero, DetailSection } from '@/components/ui/DetailHero'
import { ExternalLinkRow } from '@/components/ui/ExternalLinkRow'
import { getGuestData } from '@/lib/data/library'
import { longDate, mediumDate, todayIso } from '@/lib/domain/dates'

export const metadata: Metadata = { title: 'Tenida · Invitados' }
export const dynamic = 'force-dynamic'

export default async function GuestTenidaPage({ params }: PageProps<'/invitados/tenida/[id]'>) {
  const { id } = await params
  const { tenidas } = await getGuestData()
  const item = tenidas.find((t) => t.id === decodeURIComponent(id))
  if (!item) notFound()
  const isPast = item.fecha < todayIso()

  return (
    <>
      <Link href="/invitados" className="-ml-2 mb-3 inline-flex min-h-tap items-center gap-1 px-2 text-[14px] font-semibold text-primary">
        <ChevronLeft aria-hidden className="size-5" strokeWidth={1.75} /> Calendario
      </Link>
      <DetailHero
        kicker="Tenida"
        title={item.titulo}
        tags={item.tipo ? <Tag>{item.tipo}</Tag> : null}
        when={
          <>
            <span className="first-letter:uppercase">{longDate(item.fecha)}</span>
            {item.hora ? ` · ${item.hora}` : ''}
          </>
        }
        where={item.lugar}
      >
        {item.convocatoria || !isPast ? (
          <div className="mt-5 flex gap-2">
            {item.convocatoria ? (
              <a href={item.convocatoria} target="_blank" rel="noopener noreferrer" className={`${buttonClass('secondary')} flex-1`}>
                Ver convocatoria
              </a>
            ) : null}
            {isPast ? null : <GuestSignup tenidaId={item.id} label={`${item.titulo} · ${mediumDate(item.fecha)}`} />}
          </div>
        ) : null}
      </DetailHero>

      {item.planchas.length ? (
        <DetailSection title="Planchas" flush>
          <ul className="divide-y divide-line">
            {item.planchas.map((p) => (
              <li key={p.id}>
                <ExternalLinkRow href={p.url} title={p.titulo} subtitle={p.autor} action="Abrir en Drive" />
              </li>
            ))}
          </ul>
        </DetailSection>
      ) : null}
    </>
  )
}
