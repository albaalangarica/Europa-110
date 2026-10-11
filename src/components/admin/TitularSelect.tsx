'use client'

import { useState, useTransition } from 'react'
import { setTitular } from '@/lib/actions/oficialidad'

export function TitularSelect({ puestoId, puesto, titularId, members }: { puestoId: string; puesto: string; titularId: string; members: { id: string; nombre: string }[] }) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  return (
    <div className="grid gap-1">
      <select
        aria-label={`Titular de ${puesto}`}
        defaultValue={titularId}
        disabled={pending}
        onChange={(e) => {
          const value = e.target.value
          startTransition(async () => setMessage((await setTitular(puestoId, value)).message))
        }}
        className="control"
      >
        <option value="">Sin asignar</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nombre}
          </option>
        ))}
      </select>
      <p aria-live="polite" className="min-h-[16px] text-[12px] text-muted">
        {message}
      </p>
    </div>
  )
}
