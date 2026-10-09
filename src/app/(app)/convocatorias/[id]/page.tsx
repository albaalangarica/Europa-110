import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AppHeader, Page } from '@/components/layout/AppHeader'
import { ExternalSignup } from '@/components/agenda/ExternalSignup'
import { Tag } from '@/components/ui/Badge'
import { DetailHero, DetailSection } from '@/components/ui/DetailHero'
import { RichText } from '@/components/ui/RichText'
import { requireMember } from '@/lib/auth/session'
import { findOtraLogia } from '@/lib/data/agenda'
import { longDate } from '@/lib/domain/dates'

export const metadata: Metadata = { title: 'Convocatoria' }

export default async function ConvocatoriaPage({ params }: PageProps<'/convocatorias/[id]'>) {
  const { id } = await params
  const member = await requireMember()
  const event = await findOtraLogia(decodeURIComponent(id), member)
  if (!event) notFound()

  const rows = [
    { label: 'Logia', value: event.logia },
    { label: 'Tipo', value: event.tipo },
  ].filter((r) => r.value)

  return (
    <>
      <AppHeader title={event.titulo || 'Convocatoria'} initial={(member.nombre || member.usuario).charAt(0).toUpperCase()} back={{ href: '/', label: 'Agenda' }} />
      <Page>
        <DetailHero
          kicker="Otra convocatoria"
          title={event.titulo || 'Convocatoria'}
          tags={event.grado ? <Tag>{event.grado}</Tag> : null}
          when={
            <>
              <span className="first-letter:uppercase">{longDate(event.fecha)}</span>
              {event.hora ? ` · ${event.hora}` : ''}
              {event.presencia ? <span className="block text-[13px] text-muted">Apertura / presencia: {event.presencia}</span> : null}
            </>
          }
          where={event.lugar}
        >
          {rows.length ? (
            <dl className="mt-4 grid gap-2 border-t border-line pt-4 text-[14px]">
              {rows.map((r) => (
                <div key={r.label} className="grid grid-cols-[64px_1fr] gap-2">
                  <dt className="font-semibold text-deep">{r.label}</dt>
                  <dd>{r.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </DetailHero>

        {event.informacion ? (
          <DetailSection title="Información">
            <RichText text={event.informacion} className="text-[14px] leading-relaxed" />
          </DetailSection>
        ) : null}
        {event.observaciones ? (
          <DetailSection title="Observaciones">
            <RichText text={event.observaciones} className="text-[14px] leading-relaxed" />
          </DetailSection>
        ) : null}

        <ExternalSignup id={event.id} />
      </Page>
    </>
  )
}
