import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AppHeader, Page } from '@/components/layout/AppHeader'
import { Tag } from '@/components/ui/Badge'
import { DetailHero, DetailSection } from '@/components/ui/DetailHero'
import { ExternalLinkRow } from '@/components/ui/ExternalLinkRow'
import { RichText } from '@/components/ui/RichText'
import { requireMember } from '@/lib/auth/session'
import { findFormation } from '@/lib/data/library'
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

export default async function FormationPage({ params }: PageProps<'/formacion/[nivel]/[id]'>) {
  const { nivel, id } = await params
  const member = await requireMember()
  const item = await findFormation(decodeURIComponent(id))
  if (!item || !member.permisos.formacion.ver.includes(item.nivel)) notFound()

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

  return (
    <>
      <AppHeader title={item.titulo || 'Formación'} initial={(member.nombre || member.usuario).charAt(0).toUpperCase()} back={{ href: `/panel/${back}`, label: backLabel }} />
      <Page>
        <DetailHero
          kicker={`Formación · ${item.nivel}`}
          title={item.titulo || 'Formación'}
          tags={item.enlaces.length ? <Tag>{item.enlaces.length === 1 ? '1 material' : `${item.enlaces.length} materiales`}</Tag> : null}
          when={item.fecha ? <span className="first-letter:uppercase">{longDate(item.fecha)}</span> : 'Sin fecha'}
        />

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

        <p className="mt-6 px-1 text-[12.5px] text-muted">
          Publicado por {item.publicado_por || '—'}
          {item.publicado_at ? ` · ${dateTimeText(item.publicado_at)}` : ''}
        </p>
      </Page>
    </>
  )
}
