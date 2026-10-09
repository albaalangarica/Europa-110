import type { Metadata } from 'next'
import { LogOut, Settings2 } from 'lucide-react'
import { AppHeader, Page } from '@/components/layout/AppHeader'
import { Tag } from '@/components/ui/Badge'
import { buttonClass } from '@/components/ui/Button'
import { CardLink } from '@/components/ui/Card'
import { Section } from '@/components/ui/Section'
import { requireMember } from '@/lib/auth/session'
import { signOut } from '@/lib/actions/auth'
import { todayText } from '@/lib/domain/dates'
import { GRADE_LABEL, userCargos } from '@/lib/domain/permissions'
import { PasswordForm } from './PasswordForm'

export const metadata: Metadata = { title: 'Perfil' }

export default async function PerfilPage() {
  const member = await requireMember()
  const name = member.nombre || member.usuario
  const cargos = userCargos(member)

  return (
    <>
      <AppHeader title="Perfil" initial={name.charAt(0).toUpperCase()} back={{ href: '/', label: 'Agenda' }} />
      <Page>
        <div className="card flex items-center gap-4 p-5">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-deep text-[22px] font-semibold text-white">{name.charAt(0).toUpperCase()}</span>
          <div className="min-w-0">
            <p className="text-[19px] font-semibold leading-tight">{name}</p>
            <p className="mt-0.5 text-[13px] text-muted">{todayText()}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Tag>{GRADE_LABEL[member.grado]}</Tag>
              {cargos.map((c) => (
                <Tag key={c}>{c}</Tag>
              ))}
              {member.rol && member.rol !== 'Miembro' && !cargos.includes(member.rol) ? <Tag>{member.rol}</Tag> : null}
            </div>
          </div>
        </div>

        {member.permisos.administracion ? (
          <Section title="Administración" className="mt-6">
            <CardLink href="/admin">
              <span className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-selected text-primary">
                  <Settings2 aria-hidden className="size-5" strokeWidth={1.75} />
                </span>
                <span>
                  <span className="block text-[15px] font-semibold">Gestionar contenidos</span>
                  <span className="block text-[13px] text-muted">Tenidas, planchas, documentos, convocatorias y miembros</span>
                </span>
              </span>
            </CardLink>
          </Section>
        ) : null}

        <Section title="Contraseña" className="mt-6">
          <div className="card p-4">
            <PasswordForm />
          </div>
        </Section>

        <form action={signOut} className="mt-6">
          <button type="submit" className={buttonClass('secondary', true)}>
            <LogOut aria-hidden className="size-[18px]" strokeWidth={1.75} /> Cerrar sesión
          </button>
        </form>
      </Page>
    </>
  )
}
