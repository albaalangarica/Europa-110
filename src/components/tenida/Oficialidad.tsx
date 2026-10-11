'use client'

import { useState, useTransition } from 'react'
import { setCobertura } from '@/lib/actions/oficialidad'
import { StatusBadge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import type { PuestoTenida } from '@/lib/domain/types'

const ESTADOS = {
  confirmado: { tone: 'success', text: 'Confirmado' },
  pendiente: { tone: 'pending', text: 'Pendiente' },
  'por-cubrir': { tone: 'danger', text: 'Por cubrir' },
} as const

/** Puestos de la oficialidad en su orden, con quién los ocupa y si ha confirmado. */
export function Oficialidad({
  tenidaId,
  puestos,
  members,
  canEdit,
}: {
  tenidaId: string
  puestos: PuestoTenida[]
  members: { id: string; nombre: string }[]
  canEdit: boolean
}) {
  const confirmed = puestos.filter((p) => p.estado === 'confirmado').length
  const open = puestos.filter((p) => p.estado === 'por-cubrir').length

  return (
    <div>
      <p className="mb-3 text-[13.5px] text-muted">
        <strong className="font-semibold text-ink">
          {confirmed} de {puestos.length} confirmados
        </strong>
        {open ? <span className="text-danger"> · {open === 1 ? '1 puesto por cubrir' : `${open} puestos por cubrir`}</span> : null}
      </p>
      <ol className="-mx-4 divide-y divide-line border-t border-line">
        {puestos.map((p) => (
          <PuestoRow key={p.id} tenidaId={tenidaId} puesto={p} members={members} canEdit={canEdit} />
        ))}
      </ol>
    </div>
  )
}

function PuestoRow({ tenidaId, puesto, members, canEdit }: { tenidaId: string; puesto: PuestoTenida; members: { id: string; nombre: string }[]; canEdit: boolean }) {
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const estado = ESTADOS[puesto.estado]

  function change(miembroId: string) {
    startTransition(async () => {
      const result = await setCobertura(tenidaId, puesto.id, miembroId)
      if (result.ok) {
        setEditing(false)
        setError('')
      } else setError(result.message)
    })
  }

  return (
    <li className={cn('px-4 py-2.5', puesto.estado === 'por-cubrir' && 'bg-danger-soft/40')}>
      <div className="flex min-h-[40px] items-center gap-3">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-subtle text-[11.5px] font-semibold tabular-nums text-muted">{puesto.orden}</span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.04em] text-muted">{puesto.nombre}</p>
          <p className="truncate text-[14.5px] font-medium">{puesto.persona ? puesto.persona.nombre : <span className="text-muted">Sin asignar</span>}</p>
          {puesto.sustituto && puesto.titular ? <p className="text-[12.5px] text-muted">en lugar de {puesto.titular.nombre}</p> : null}
        </div>
        <StatusBadge tone={estado.tone} className="shrink-0">
          {estado.text}
        </StatusBadge>
        {canEdit && !editing ? (
          <button type="button" onClick={() => setEditing(true)} className="-mr-2 min-h-tap shrink-0 rounded-control px-2 text-[13px] font-semibold text-primary hover:bg-selected">
            Cubrir
          </button>
        ) : null}
      </div>
      {editing ? (
        <div className="mt-2 flex gap-2 pl-9">
          <select
            aria-label={`Quién cubre ${puesto.nombre}`}
            defaultValue={puesto.sustituto && puesto.persona ? puesto.persona.id : ''}
            disabled={pending}
            onChange={(e) => change(e.target.value)}
            className="control min-w-0 flex-1"
          >
            <option value="">{puesto.titular ? `Titular: ${puesto.titular.nombre}` : 'Sin asignar'}</option>
            {members
              .filter((m) => m.id !== puesto.titular?.id)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
          </select>
          <button type="button" onClick={() => setEditing(false)} className="min-h-tap rounded-control px-3 text-[13px] font-semibold text-muted hover:bg-subtle">
            Cerrar
          </button>
        </div>
      ) : null}
      {error ? <p className="mt-1 pl-9 text-[13px] text-danger">{error}</p> : null}
    </li>
  )
}
