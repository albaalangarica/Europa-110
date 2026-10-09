import Link from 'next/link'
import { CalendarDays, ChevronRight, HandCoins, ScrollText } from 'lucide-react'
import { AdminAttendance } from '@/components/tenida/AdminAttendance'
import { AttendanceNames, AttendanceSummary } from '@/components/tenida/AttendanceSummary'
import { TroncoForm } from '@/components/tenida/TroncoForm'
import { ExternalLinkRow } from '@/components/ui/ExternalLinkRow'
import { Section } from '@/components/ui/Section'
import { EmptyState } from '@/components/ui/States'
import type { ManagementData } from '@/lib/data/library'
import { shortDate, todayIso } from '@/lib/domain/dates'
import type { Permisos } from '@/lib/domain/permissions'
import { driveViewUrl, formatMoney } from '@/lib/domain/text'

/** Panel de Secretaría y del Venerable Maestro: planchas sin leer, confirmaciones y Tronco de la Viuda. */
export function ManagementView({ data, permisos }: { data: ManagementData; permisos: Permisos }) {
  const troncoById = new Map(data.tronco.map((t) => [t.tenida_id, t]))
  // La próxima tenida se muestra desplegada; el resto, con su resumen y el detalle plegado.
  const today = todayIso()
  const nextId = data.attendance.find((r) => r.fecha >= today)?.tenidaId

  return (
    <>
      <p className="mb-6 px-1 text-[14px] text-muted">Seguimiento de asistencias, planchas pendientes, Tronco de la Viuda e información de Secretaría.</p>

      <Section title="Planchas sin leer">
        {data.unreadPapers.length ? (
          <div className="card overflow-hidden">
            <ul className="divide-y divide-line">
              {data.unreadPapers.map((p) => (
                <li key={p.id}>
                  <ExternalLinkRow
                    href={driveViewUrl(p.enlace)}
                    title={p.titulo || 'Plancha'}
                    subtitle={[p.autor, p.tema].filter(Boolean).join(' · ') || 'Pendiente de incluir en un próximo orden del día'}
                    action="Abrir en Drive"
                  />
                </li>
              ))}
            </ul>
            <p className="border-t border-line px-4 py-2.5 text-[12.5px] text-muted">Pendientes de incluir en un próximo orden del día.</p>
          </div>
        ) : (
          <EmptyState icon={ScrollText} title="No hay planchas pendientes de lectura" />
        )}
      </Section>

      <Section title="Confirmaciones a las tenidas">
        {data.attendance.length ? (
          <div className="grid gap-2.5">
            {data.attendance.map((row) => {
              const tronco = troncoById.get(row.tenidaId)
              return (
                <article key={row.tenidaId} className="card p-4">
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <Link href={`/tenidas/${encodeURIComponent(row.tenidaId)}`} className="min-w-0 text-[15.5px] font-semibold leading-snug hover:text-primary">
                      {row.titulo}
                    </Link>
                    <span className="shrink-0 text-[13px] tabular-nums text-muted">{shortDate(row.fecha)}</span>
                  </div>
                  <AttendanceSummary row={row} names={false} />
                  <details open={row.tenidaId === nextId} className="mt-2">
                    <summary className="-mx-1 flex min-h-tap cursor-pointer items-center gap-1.5 px-1 text-[13.5px] font-semibold text-primary">
                      <ChevronRight aria-hidden className="rotate-open size-4 transition-transform" strokeWidth={2} />
                      Nombres{permisos.asistencia ? ', asistencia' : ''}
                      {permisos.tronco ? ' y Tronco' : ''}
                      {tronco ? <span className="ml-auto font-medium tabular-nums text-muted">{formatMoney(tronco.importe)}</span> : null}
                    </summary>
                    <AttendanceNames row={row} />
                    {permisos.asistencia && row.personas.length ? <AdminAttendance row={row} /> : null}
                    {permisos.tronco ? (
                      <div className="mt-3 border-t border-line pt-1">
                        <TroncoForm tenidaId={row.tenidaId} amount={tronco ? tronco.importe : null} compact />
                      </div>
                    ) : null}
                  </details>
                </article>
              )
            })}
          </div>
        ) : (
          <EmptyState icon={CalendarDays} title="No hay tenidas disponibles" />
        )}
      </Section>

      <Section title="Tronco de la Viuda">
        {data.tronco.length ? (
          <ul className="card divide-y divide-line overflow-hidden">
            {data.tronco.map((t) => (
              <li key={t.tenida_id} className="flex min-h-[56px] items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-semibold">{t.titulo}</p>
                  <p className="text-[13px] tabular-nums text-muted">{shortDate(t.fecha)}</p>
                </div>
                <p className="text-[16px] font-semibold tabular-nums text-deep">{formatMoney(t.importe)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={HandCoins} title="Todavía no hay importes registrados" />
        )}
      </Section>
    </>
  )
}
