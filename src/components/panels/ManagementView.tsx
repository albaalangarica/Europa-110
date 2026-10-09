import Link from 'next/link'
import { CalendarDays, ChevronRight, HandCoins, ScrollText } from 'lucide-react'
import { AdminAttendance } from '@/components/tenida/AdminAttendance'
import { AttendanceSummary } from '@/components/tenida/AttendanceSummary'
import { TroncoForm } from '@/components/tenida/TroncoForm'
import { ExternalLinkRow } from '@/components/ui/ExternalLinkRow'
import { Section } from '@/components/ui/Section'
import { EmptyState } from '@/components/ui/States'
import type { ManagementData, TroncoRow } from '@/lib/data/library'
import type { AttendanceSummary as AttendanceSummaryRow } from '@/lib/domain/types'
import { shortDate, todayIso } from '@/lib/domain/dates'
import type { Permisos } from '@/lib/domain/permissions'
import { driveViewUrl, formatMoney } from '@/lib/domain/text'

/** Panel de Secretaría y del Venerable Maestro: planchas sin leer, confirmaciones y Tronco de la Viuda. */
export function ManagementView({ data, permisos }: { data: ManagementData; permisos: Permisos }) {
  const troncoById = new Map(data.tronco.map((t) => [t.tenida_id, t]))
  // La próxima tenida, la que tiene la confirmación abierta, se ve entera; el resto, en desplegables.
  const today = todayIso()
  const next = data.attendance.find((r) => r.fecha >= today) ?? null
  const later = data.attendance.filter((r) => r.fecha >= today && r !== next)
  const recent = data.attendance.filter((r) => r.fecha < today).reverse()

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

      <Section title="Próxima tenida">
        {next ? (
          <article className="card p-4">
            <TenidaHeading row={next} />
            <TenidaBody row={next} permisos={permisos} tronco={troncoById.get(next.tenidaId)} />
          </article>
        ) : (
          <EmptyState icon={CalendarDays} title="No hay ninguna tenida próxima" />
        )}
      </Section>

      {[
        { title: 'Siguientes tenidas', rows: later },
        { title: 'Tenidas recientes', rows: recent },
      ].map(({ title, rows }) =>
        rows.length ? (
          <Section key={title} title={title}>
            <div className="grid gap-2">
              {rows.map((row) => {
                const tronco = troncoById.get(row.tenidaId)
                return (
                  <details key={row.tenidaId} className="card overflow-hidden">
                    <summary className="flex min-h-[56px] cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-subtle">
                      <ChevronRight aria-hidden className="rotate-open size-4 shrink-0 text-muted transition-transform" strokeWidth={2} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-semibold">{row.titulo}</span>
                        <span className="block text-[12.5px] tabular-nums text-muted">{shortDate(row.fecha)}</span>
                      </span>
                      <span className="shrink-0 text-[12.5px] font-semibold tabular-nums">
                        <span className="text-primary">{row.si.length} sí</span>
                        <span className="text-faint"> · </span>
                        <span className="text-danger">{row.no.length} no</span>
                        {tronco ? <span className="ml-2 font-medium text-muted">{formatMoney(tronco.importe)}</span> : null}
                      </span>
                    </summary>
                    <div className="border-t border-line p-4">
                      <TenidaHeading row={row} />
                      <TenidaBody row={row} permisos={permisos} tronco={tronco} />
                    </div>
                  </details>
                )
              })}
            </div>
          </Section>
        ) : null,
      )}

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

function TenidaHeading({ row }: { row: AttendanceSummaryRow }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <Link href={`/tenidas/${encodeURIComponent(row.tenidaId)}`} className="min-w-0 text-[15.5px] font-semibold leading-snug hover:text-primary">
        {row.titulo}
      </Link>
      <span className="shrink-0 text-[13px] tabular-nums text-muted">{shortDate(row.fecha)}</span>
    </div>
  )
}

function TenidaBody({ row, permisos, tronco }: { row: AttendanceSummaryRow; permisos: Permisos; tronco?: TroncoRow }) {
  return (
    <>
      <AttendanceSummary row={row} />
      {permisos.asistencia && row.personas.length ? <AdminAttendance row={row} /> : null}
      {permisos.tronco ? (
        <div className="mt-3 border-t border-line pt-1">
          <TroncoForm tenidaId={row.tenidaId} amount={tronco ? tronco.importe : null} compact />
        </div>
      ) : null}
    </>
  )
}
