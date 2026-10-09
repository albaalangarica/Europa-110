import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CalendarPlus } from 'lucide-react'
import { AppHeader, Page } from '@/components/layout/AppHeader'
import { Contributions } from '@/components/formation/Contributions'
import { Tag } from '@/components/ui/Badge'
import { buttonClass } from '@/components/ui/Button'
import { DetailHero, DetailSection } from '@/components/ui/DetailHero'
import { ExternalLinkRow } from '@/components/ui/ExternalLinkRow'
import { RichText } from '@/components/ui/RichText'
import { requireMember } from '@/lib/auth/session'
import { getContributions } from '@/lib/data/aportaciones'
import { findFormation } from '@/lib/data/library'
import { googleCalendarUrl } from '@/lib/domain/calendar'
import { dateTimeText, longDate } from '@/lib/domain/dates'
import { rolePanels } from '@/lib/domain/permissions'
import { safeLink } from '@/lib/domain/text'

export const metadata: Metadata = { title: 'Formación' }

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** Cada formación es un panel: convocatoria, calendario, materiales y aportaciones de los hermanos. */
export default async function FormationPage({ params }: PageProps<'/formacion/[nivel]/[id]'>) {
  const { nivel, id } = await params
  const member = await requireMember()
  const item = await findFormation(decodeURIComponent(id))
  if (!item || !member.permisos.formacion.ver.includes(item.nivel)) notFound()
  const contributions = await getContributions(item.id)

  // Se vuelve al panel de la persona (Vigilante, apoyo o Compañero/Aprendiz).
  const panels = rolePanels(member.permisos)
  const back =
    nivel === 'aprendiz'
      ? panels.includes('segundo-vigilante') ? 'segundo-vigilante' : 'aprendiz'
      : panels.includes('primer-vigilante') ? 'primer-vigilante' : 'companero'
  const backLabel = {
    'primer-vigilante': member.permisos.primerVigilante ? '1er Vigilante' : 'Formación',
    'segundo-vigilante': member.permisos.segundoVigilante ? '2º Vigilante' : 'Formación',
    companero: 'Compañero',
    aprendiz: 'Aprendiz',
  }[back]
  const canModerate = member.permisos.administracion || member.permisos.formacion.publicar.includes(item.nivel)
  const place = safeLink(item.lugar) ? '' : item.lugar
  const placeLink = safeLink(item.lugar)

  return (
    <>
      <AppHeader title={item.titulo || 'Formación'} initial={(member.nombre || member.usuario).charAt(0).toUpperCase()} back={{ href: `/panel/${back}`, label: backLabel }} />
      <Page>
        <DetailHero
          kicker={`Formación · ${item.nivel}`}
          title={item.titulo || 'Formación'}
          tags={item.enlaces.length ? <Tag>{item.enlaces.length === 1 ? '1 material' : `${item.enlaces.length} materiales`}</Tag> : null}
          when={
            item.fecha ? (
              <>
                <span className="first-letter:uppercase">{longDate(item.fecha)}</span>
                {item.hora ? ` · ${item.hora}` : ''}
              </>
            ) : (
              'Sin fecha'
            )
          }
          where={place}
        >
          {placeLink ? (
            <a href={placeLink} target="_blank" rel="noopener noreferrer" className={`${buttonClass('secondary', true)} mt-4`}>
              Abrir enlace de conexión
            </a>
          ) : null}
          {item.fecha ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a href={`/formacion/${nivel}/${encodeURIComponent(item.id)}/calendario`} className={buttonClass('primary')}>
                <CalendarPlus aria-hidden className="size-[18px]" strokeWidth={1.75} />
                Añadir al calendario
              </a>
              <a
                href={googleCalendarUrl({ uid: item.id, title: `Formación: ${item.titulo}`, date: item.fecha, time: item.hora, location: item.lugar, description: item.nota })}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass('secondary')}
              >
                Google Calendar
              </a>
            </div>
          ) : null}
        </DetailHero>

        {item.nota ? (
          <DetailSection title="Descripción">
            <RichText text={item.nota} className="text-[14.5px] leading-relaxed" />
          </DetailSection>
        ) : null}

        {item.enlaces.length ? (
          <DetailSection title="Materiales" flush>
            <ol className="divide-y divide-line">
              {item.enlaces.map((url, i) => (
                <li key={i}>
                  <ExternalLinkRow href={safeLink(url)} title={`Material ${i + 1}`} subtitle={host(url)} />
                </li>
              ))}
            </ol>
          </DetailSection>
        ) : null}

        <section className="mt-6">
          <h3 className="eyebrow mb-1 px-1">Aportaciones{contributions.length ? ` · ${contributions.length}` : ''}</h3>
          <p className="mb-3 px-1 text-[13px] text-muted">Reflexiones y enlaces de los hermanos. Los ven quienes tienen acceso a esta formación.</p>
          <Contributions formacionId={item.id} items={contributions} me={member.id} canModerate={canModerate} />
        </section>

        <p className="mt-6 px-1 text-[12.5px] text-muted">
          Publicado por {item.publicado_por || '—'}
          {item.publicado_at ? ` · ${dateTimeText(item.publicado_at)}` : ''}
        </p>
      </Page>
    </>
  )
}
