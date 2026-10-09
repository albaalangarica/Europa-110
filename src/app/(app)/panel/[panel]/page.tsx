import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BookOpen } from 'lucide-react'
import { AppHeader, Page } from '@/components/layout/AppHeader'
import { FormationCard } from '@/components/formation/FormationCard'
import { PublishFormation } from '@/components/formation/PublishFormation'
import { ManagementView } from '@/components/panels/ManagementView'
import { EmptyState } from '@/components/ui/States'
import { Tabs } from '@/components/ui/Tabs'
import { requireMember, type CurrentMember } from '@/lib/auth/session'
import { getFormations, getManagementData } from '@/lib/data/library'
import { todayIso } from '@/lib/domain/dates'
import type { FormationLevel, RolePanel } from '@/lib/domain/permissions'
import type { Formacion } from '@/lib/domain/types'

interface PanelConfig {
  allowed: (m: CurrentMember) => boolean
  title: (m: CurrentMember) => string
  kind: 'gestion' | 'publicar' | 'ver'
  level?: FormationLevel
  intro?: (m: CurrentMember) => string
}

const PANELS: Record<RolePanel, PanelConfig> = {
  secretaria: { allowed: (m) => m.permisos.secretaria, title: () => 'Secretaría', kind: 'gestion' },
  venerable: { allowed: (m) => m.permisos.venerable, title: () => 'Venerable Maestro', kind: 'gestion' },
  'primer-vigilante': {
    allowed: (m) => m.permisos.formacion.publicar.includes('Compañero'),
    title: (m) => (m.permisos.primerVigilante ? 'Primer Vigilante' : 'Formación de Compañeros'),
    kind: 'publicar',
    level: 'Compañero',
    intro: () => 'Convocatorias de formación para los Compañeros.',
  },
  companero: {
    allowed: (m) => m.permisos.formacion.ver.includes('Compañero'),
    title: () => 'Compañero',
    kind: 'ver',
    level: 'Compañero',
    intro: () => 'Convocatorias y materiales de formación.',
  },
  'segundo-vigilante': {
    allowed: (m) => m.permisos.formacion.publicar.includes('Aprendiz'),
    title: (m) => (m.permisos.segundoVigilante ? 'Segundo Vigilante' : 'Formación de Aprendices'),
    kind: 'publicar',
    level: 'Aprendiz',
    intro: () => 'Convocatorias de formación para Aprendices.',
  },
  aprendiz: {
    allowed: (m) => m.permisos.formacion.ver.includes('Aprendiz'),
    title: () => 'Aprendiz',
    kind: 'ver',
    level: 'Aprendiz',
    intro: () => 'Convocatorias y materiales de formación.',
  },
}

export const metadata: Metadata = { title: 'Panel' }

export default async function PanelPage({ params, searchParams }: PageProps<'/panel/[panel]'>) {
  const { panel } = await params
  const { tab } = await searchParams
  const config = PANELS[panel as RolePanel]
  if (!config) notFound()

  const member = await requireMember()
  if (!config.allowed(member)) notFound()
  const initial = (member.nombre || member.usuario).charAt(0).toUpperCase()

  if (config.kind === 'gestion') {
    const data = await getManagementData()
    return (
      <>
        <AppHeader title={config.title(member)} initial={initial} />
        <Page>
          <ManagementView data={data} permisos={member.permisos} />
        </Page>
      </>
    )
  }

  const level = config.level!
  const items = await getFormations([level])
  const today = todayIso()
  // Las formaciones sin fecha se consideran próximas.
  const upcoming = items.filter((f) => !f.fecha || f.fecha >= today).sort(byDate)
  const past = items.filter((f) => f.fecha && f.fecha < today).sort(byDate).reverse()
  const active = tab === 'anteriores' ? 'anteriores' : 'proximas'
  const list = active === 'anteriores' ? past : upcoming
  const audience = level === 'Aprendiz' ? 'Aprendices' : 'Compañeros'

  return (
    <>
      <AppHeader title={config.title(member)} initial={initial} />
      <Page>
        <p className="mb-4 px-1 text-[14px] text-muted">{config.intro?.(member)}</p>
        {config.kind === 'publicar' ? (
          <div className="mb-5">
            <PublishFormation level={level} audience={audience} />
          </div>
        ) : null}
        <Tabs
          label="Formaciones"
          active={active}
          items={[
            { key: 'proximas', label: 'Próximas', href: `/panel/${panel}`, count: upcoming.length },
            { key: 'anteriores', label: 'Anteriores', href: `/panel/${panel}?tab=anteriores`, count: past.length },
          ]}
        />
        <div className="mt-4 grid gap-2.5">
          {list.length ? (
            list.map((f) => <FormationCard key={f.id} item={f} past={active === 'anteriores'} />)
          ) : (
            <EmptyState icon={BookOpen} title={active === 'anteriores' ? 'Todavía no hay formaciones anteriores' : 'No hay convocatorias de formación'}>
              {active === 'anteriores'
                ? 'Las formaciones celebradas se guardarán aquí con todos sus materiales.'
                : `Cuando se convoque una formación para ${audience} aparecerá aquí.`}
            </EmptyState>
          )}
        </div>
      </Page>
    </>
  )
}

function byDate(a: Formacion, b: Formacion): number {
  return (a.fecha || '9999').localeCompare(b.fecha || '9999') || a.publicado_at.localeCompare(b.publicado_at)
}
