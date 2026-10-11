import type { Metadata } from 'next'
import { FileText, HeartHandshake } from 'lucide-react'
import { AppHeader, Page } from '@/components/layout/AppHeader'
import { LibraryCard } from '@/components/library/LibraryCard'
import { Section } from '@/components/ui/Section'
import { EmptyState } from '@/components/ui/States'
import { requireMember } from '@/lib/auth/session'
import { getDocumentos } from '@/lib/data/library'
import { getChecklist } from '@/lib/data/hospitalaria'
import { HospitalariaChecklist } from '@/components/interno/HospitalariaChecklist'
import { mediumDate } from '@/lib/domain/dates'
import { displayTitle } from '@/lib/domain/tenidas'

export const metadata: Metadata = { title: 'Interno' }

export default async function InternoPage() {
  const member = await requireMember()
  const [documentos, checklist] = await Promise.all([
    getDocumentos(member),
    member.permisos.hospitalaria ? getChecklist(member.id) : Promise.resolve(null),
  ])
  return (
    <>
      <AppHeader title="Interno" initial={(member.nombre || member.usuario).charAt(0).toUpperCase()} />
      <Page>
        {checklist?.ready ? (
          <Section title="Hospitalaria · contactos entre tenidas">
            <HospitalariaChecklist
              items={checklist.items}
              hasta={
                checklist.hasta
                  ? `Antes de la ${displayTitle({ titulo: checklist.hasta.titulo, tipo: '' })} del ${mediumDate(checklist.hasta.fecha)}`
                  : 'Hasta la próxima tenida'
              }
            />
          </Section>
        ) : null}

        <Section title="Asuntos de familia">
          <EmptyState icon={HeartHandshake} title="Sin asuntos publicados" />
        </Section>
        <Section title="Documentos">
          {documentos.length ? (
            <div className="grid gap-2.5">
              {documentos.map((d) => (
                <LibraryCard key={d.id} fecha={d.fecha} tag={d.categoria} title={d.titulo} summary={d.descripcion} href={d.enlace} action="Abrir documento" />
              ))}
            </div>
          ) : (
            <EmptyState icon={FileText} title="No hay documentos visibles">
              Actas, reglamentos y circulares aparecerán aquí.
            </EmptyState>
          )}
        </Section>
      </Page>
    </>
  )
}
