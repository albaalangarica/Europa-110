import type { Metadata } from 'next'
import { CalendarDays } from 'lucide-react'
import { AppHeader, Page } from '@/components/layout/AppHeader'
import { MonthEvents } from '@/components/agenda/MonthEvents'
import { TenidaCard } from '@/components/agenda/TenidaCard'
import { EmptyState } from '@/components/ui/States'
import { requireMember } from '@/lib/auth/session'
import { getAgenda } from '@/lib/data/agenda'
import { canOpenDate, monthKey, monthLabel, monthYearLabel, todayIso } from '@/lib/domain/dates'

export const metadata: Metadata = { title: 'Agenda' }

export default async function AgendaPage() {
  const member = await requireMember()
  const { tenidas, externos } = await getAgenda(member)

  const today = todayIso()
  const currentMonth = monthKey(today)
  const allDates = tenidas.map((t) => t.fecha)
  const upcoming = tenidas.filter((t) => monthKey(t.fecha) >= currentMonth)
  const older = tenidas.filter((t) => monthKey(t.fecha) < currentMonth).reverse()

  // Se muestran los meses con tenidas o con convocatorias de otras logias.
  const months = new Set(upcoming.map((t) => monthKey(t.fecha)))
  for (const e of externos) if (monthKey(e.fecha) >= currentMonth) months.add(monthKey(e.fecha))
  const currentYear = today.slice(0, 4)

  return (
    <>
      <AppHeader title="Agenda" initial={(member.nombre || member.usuario).charAt(0).toUpperCase()} />
      <Page>
        {[...months].sort().map((key) => (
          <section key={key} className="mb-7" aria-labelledby={`mes-${key}`}>
            <h2 id={`mes-${key}`} className="eyebrow mb-2.5 px-1">
              {key.slice(0, 4) === currentYear ? monthLabel(key) : monthYearLabel(key)}
            </h2>
            <div className="grid gap-2.5">
              {upcoming
                .filter((t) => monthKey(t.fecha) === key)
                .map((t) => (
                  <TenidaCard key={t.id} item={t} canOpen={canOpenDate(t.fecha, allDates, today)} past={t.fecha < today} />
                ))}
            </div>
            <MonthEvents monthKey={key} events={externos.filter((e) => monthKey(e.fecha) === key)} />
          </section>
        ))}

        {!upcoming.length ? (
          <EmptyState icon={CalendarDays} title="No hay tenidas programadas" className="mb-7">
            Cuando Secretaría publique el calendario aparecerá aquí.
          </EmptyState>
        ) : null}

        {older.length ? (
          <section aria-labelledby="anteriores">
            <h2 id="anteriores" className="eyebrow mb-2.5 px-1">
              Tenidas anteriores
            </h2>
            <div className="grid gap-2.5">
              {older.map((t) => (
                <TenidaCard key={t.id} item={t} canOpen past />
              ))}
            </div>
          </section>
        ) : null}
      </Page>
    </>
  )
}
