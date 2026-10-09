'use client'

import { useState, useTransition } from 'react'
import { saveTronco } from '@/lib/actions/lodge'
import { Button } from '@/components/ui/Button'

/** Registro del importe del Tronco de la Viuda (Secretaría, Tesorería, Hospitalario, Tronco o Administración). */
export function TroncoForm({ tenidaId, amount, compact }: { tenidaId: string; amount: number | null; compact?: boolean }) {
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  const inputId = `tronco-${tenidaId}`

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = String(new FormData(event.currentTarget).get('importe') ?? '')
    setMessage('Guardando…')
    startTransition(async () => {
      const result = await saveTronco(tenidaId, value)
      setMessage(result.message)
    })
  }

  return (
    <form onSubmit={onSubmit} className={compact ? 'mt-3' : 'mt-4 border-t border-line pt-4'}>
      <label htmlFor={inputId} className="text-[13px] font-semibold text-deep">
        Importe del Tronco de la Viuda
      </label>
      <div className="mt-1.5 flex gap-2">
        <div className="relative flex-1">
          <input
            id={inputId}
            name="importe"
            type="text"
            inputMode="decimal"
            pattern="[0-9]+([.,][0-9]{1,2})?"
            title="Importe en euros, por ejemplo 12,50"
            placeholder="0,00"
            defaultValue={amount == null ? '' : String(amount).replace('.', ',')}
            className="control pr-9 tabular-nums"
          />
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3.5 grid place-items-center text-muted">
            €
          </span>
        </div>
        <Button type="submit" disabled={pending}>
          Guardar
        </Button>
      </div>
      <p aria-live="polite" className="mt-1.5 min-h-[18px] text-[13px] text-muted">
        {message}
      </p>
    </form>
  )
}
