import type { Metadata } from 'next'
import { FileText, HeartHandshake } from 'lucide-react'
import { AppHeader, Page } from '@/components/layout/AppHeader'
import { LibraryCard } from '@/components/library/LibraryCard'
import { Section } from '@/components/ui/Section'
import { EmptyState } from '@/components/ui/States'
import { requireMember } from '@/lib/auth/session'
import { getDocumentos } from '@/lib/data/library'

export const metadata: Metadata = { title: 'Interno' }

export default async function InternoPage() {
  const member = await requireMember()
  const documentos = await getDocumentos(member)
  return (
    <>
      <AppHeader title="Interno" initial={(member.nombre || member.usuario).charAt(0).toUpperCase()} />
      <Page>
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
