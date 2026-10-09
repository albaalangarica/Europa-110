import type { AttendanceSummary as Summary } from '@/lib/domain/types'

/** Pastillas sí / no / sin confirmar y los nombres. También lo usan los paneles de Secretaría y Venerable. */
export function AttendanceSummary({ row, names = true }: { row: Summary; names?: boolean }) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat value={row.si.length} label="sí" tone="text-primary bg-selected" />
        <Stat value={row.no.length} label="no" tone="text-danger bg-danger-soft" />
        <Stat value={row.pendientes.length} label="sin confirmar" tone="text-warning bg-warning-soft" />
      </div>
      {names ? <AttendanceNames row={row} /> : null}
    </div>
  )
}

export function AttendanceNames({ row }: { row: Summary }) {
  const list = (names: string[]) => (names.length ? names.join(', ') : '—')
  return (
    <div>
      <dl className="mt-3 grid gap-2 text-[13.5px]">
        <Names label="Asisten" value={list(row.si)} />
        <Names label="No asisten" value={list(row.no)} />
        <Names label="Pendientes" value={list(row.pendientes)} />
      </dl>
    </div>
  )
}

function Stat({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <div className={`rounded-control px-2 py-2 ${tone}`}>
      <p className="text-[19px] font-semibold tabular-nums leading-none">{value}</p>
      <p className="mt-1 text-[11.5px] font-semibold">{label}</p>
    </div>
  )
}

function Names({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[92px_1fr] gap-2">
      <dt className="font-semibold text-deep">{label}</dt>
      <dd className="text-muted">{value}</dd>
    </div>
  )
}
