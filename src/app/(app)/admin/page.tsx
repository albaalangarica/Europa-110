import type { Metadata } from 'next'
import { CalendarDays, FileText, GraduationCap, Landmark, ScrollText, UserPlus, Users } from 'lucide-react'
import { AppHeader, Page } from '@/components/layout/AppHeader'
import { CardLink } from '@/components/ui/Card'
import { requireMember } from '@/lib/auth/session'
import { db } from '@/lib/supabase/admin'

export const metadata: Metadata = { title: 'Administración' }

const SECTIONS = [
  { href: '/admin/tenidas', table: 'tenidas', label: 'Tenidas', text: 'Agenda, orden del día y convocatorias', Icon: CalendarDays },
  { href: '/admin/convocatorias', table: 'otras_logias', label: 'Otras logias', text: 'Invitaciones y actos de cada mes', Icon: Landmark },
  { href: '/admin/planchas', table: 'planchas', label: 'Planchas', text: 'Trabajos, autores y tenida de lectura', Icon: ScrollText },
  { href: '/admin/documentos', table: 'documentos', label: 'Documentos', text: 'Actas, reglamentos y circulares', Icon: FileText },
  { href: '/admin/formaciones', table: 'formaciones', label: 'Formaciones', text: 'Lo publicado por los Vigilantes', Icon: GraduationCap },
  { href: '/admin/miembros', table: 'miembros', label: 'Miembros', text: 'Usuarios, grados, cargos y contraseñas', Icon: Users },
  { href: '/admin/invitados', table: 'invitados', label: 'Invitados', text: 'Inscripciones de visitantes', Icon: UserPlus },
]

export default async function AdminPage() {
  const member = await requireMember()
  const counts = await Promise.all(SECTIONS.map((s) => db().from(s.table).select('*', { count: 'exact', head: true })))
  return (
    <>
      <AppHeader title="Administración" initial={(member.nombre || member.usuario).charAt(0).toUpperCase()} back={{ href: '/perfil', label: 'Perfil' }} />
      <Page>
        <p className="mb-4 px-1 text-[14px] text-muted">Aquí se edita lo que antes se editaba en el Google Sheet.</p>
        <div className="grid gap-2.5">
          {SECTIONS.map(({ href, label, text, Icon }, i) => (
            <CardLink key={href} href={href}>
              <span className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-selected text-primary">
                  <Icon aria-hidden className="size-5" strokeWidth={1.75} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold">
                    {label} <span className="font-normal tabular-nums text-muted">· {counts[i]?.count ?? 0}</span>
                  </span>
                  <span className="block truncate text-[13px] text-muted">{text}</span>
                </span>
              </span>
            </CardLink>
          ))}
        </div>
      </Page>
    </>
  )
}
