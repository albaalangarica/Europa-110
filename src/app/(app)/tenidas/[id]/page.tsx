import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AppHeader, Page } from '@/components/layout/AppHeader'
import { AttendanceBox } from '@/components/tenida/AttendanceBox'
import { AttendanceSummary } from '@/components/tenida/AttendanceSummary'
import { TroncoForm } from '@/components/tenida/TroncoForm'
import { Tag } from '@/components/ui/Badge'
import { DetailHero, DetailSection } from '@/components/ui/DetailHero'
import { ExternalLinkRow } from '@/components/ui/ExternalLinkRow'
import { RichText } from '@/components/ui/RichText'
import { requireMember } from '@/lib/auth/session'
import { getTenidaDetail } from '@/lib/data/agenda'
import { attendanceIsOpen, longDate } from '@/lib/domain/dates'
import { displayTitle } from '@/lib/domain/tenidas'
import { driveViewUrl, formatMoney, lines, safeLink } from '@/lib/domain/text'

export const metadata: Metadata = { title: 'Tenida' }

export default async function TenidaPage({ params }: PageProps<'/tenidas/[id]'>) {
  const { id } = await params
  const member = await requireMember()
  const detail = await getTenidaDetail(decodeURIComponent(id), member, member.permisos.gestion)
  if (!detail) notFound()

  const { tenida, planchas, tronco, summary } = detail
  const order = lines(tenida.orden_del_dia)
  const convocatoria = safeLink(tenida.convocatoria)

  return (
    <>
      <AppHeader title={displayTitle(tenida)} initial={(member.nombre || member.usuario).charAt(0).toUpperCase()} back={{ href: '/', label: 'Agenda' }} />
      <Page>
        <DetailHero
          kicker={tenida.numero ? `Tenida nº ${tenida.numero}` : 'Tenida'}
          title={displayTitle(tenida)}
          tags={tenida.tipo ? <Tag>{tenida.tipo}</Tag> : null}
          when={
            <>
              <span className="first-letter:uppercase">{longDate(tenida.fecha)}</span>
              {tenida.hora ? ` · ${tenida.hora}` : ''}
              {tenida.libro_presencia ? <span className="block text-[13px] text-muted">Libro de presencia: {tenida.libro_presencia}</span> : null}
            </>
          }
          where={tenida.lugar}
        />

        {attendanceIsOpen(tenida.fecha) ? (
          <DetailSection title="Asistencia">
            <AttendanceBox tenidaId={tenida.id} answer={tenida.miAsistencia} />
          </DetailSection>
        ) : null}

        {member.permisos.gestion && summary ? (
          <DetailSection title="Confirmaciones de la tenida">
            <AttendanceSummary row={summary} />
          </DetailSection>
        ) : null}

        <DetailSection title="Asuntos de familia">
          <p className="text-[14.5px] font-semibold">Tronco de la Viuda</p>
          {tronco ? (
            <p className="mt-0.5 text-[22px] font-semibold tabular-nums text-deep">{formatMoney(tronco.importe)}</p>
          ) : (
            <p className="mt-0.5 text-[13.5px] text-muted">Importe pendiente de registrar</p>
          )}
          {tronco?.observaciones ? <p className="mt-1 text-[13.5px] text-muted">{tronco.observaciones}</p> : null}
          {member.permisos.tronco ? <TroncoForm tenidaId={tenida.id} amount={tronco ? tronco.importe : null} /> : null}
        </DetailSection>

        {tenida.descripcion ? (
          <DetailSection title="Información">
            <RichText text={tenida.descripcion} className="text-[14px] leading-relaxed text-ink" />
          </DetailSection>
        ) : null}

        {order.length ? (
          <DetailSection title="Orden del día">
            <ol className="grid gap-3">
              {order.map((point, i) => (
                <li key={i} className="flex gap-3 text-[14px] leading-relaxed">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-selected text-[12px] font-semibold tabular-nums text-primary">
                    {i + 1}
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ol>
          </DetailSection>
        ) : null}

        {planchas.length ? (
          <DetailSection title="Planchas" flush>
            <ul className="divide-y divide-line">
              {planchas.map((p) => (
                <li key={p.id}>
                  <ExternalLinkRow href={driveViewUrl(p.enlace)} title={p.titulo || 'Plancha'} subtitle={p.autor} action="Abrir en Drive" />
                </li>
              ))}
            </ul>
          </DetailSection>
        ) : null}

        {convocatoria ? (
          <DetailSection title="Documentación" flush>
            <ExternalLinkRow href={convocatoria} title="Convocatoria" />
          </DetailSection>
        ) : null}
      </Page>
    </>
  )
}
