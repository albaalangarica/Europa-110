'use client'

import { useState, useTransition } from 'react'
import { Check, X } from 'lucide-react'
import { saveAttendance } from '@/lib/actions/lodge'
import { buttonClass } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import type { Respuesta } from '@/lib/domain/types'

/** Confirmar o excusar la asistencia. Se puede cambiar la respuesta después. */
export function AttendanceBox({ tenidaId, answer }: { tenidaId: string; answer: Respuesta | '' }) {
  const [current, setCurrent] = useState(answer)
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()

  function choose(value: Respuesta) {
    setMessage('Guardando…')
    startTransition(async () => {
      const result = await saveAttendance(tenidaId, value)
      if (result.ok) setCurrent(value)
      setMessage(result.message)
    })
  }

  return (
    <div>
      <p className="text-[13.5px] text-muted">Confirma si asistirás a esta tenida. Puedes cambiar tu respuesta después.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={pending}
          aria-pressed={current === 'Sí'}
          onClick={() => choose('Sí')}
          className={cn(buttonClass(current === 'Sí' ? 'primary' : 'secondary'), 'gap-1.5 px-2 text-[14px] disabled:opacity-100')}
        >
          <Check aria-hidden className="size-4" strokeWidth={2.25} />
          Confirmo asistencia
        </button>
        <button
          type="button"
          disabled={pending}
          aria-pressed={current === 'No'}
          onClick={() => choose('No')}
          className={cn(buttonClass(current === 'No' ? 'selected' : 'secondary'), 'gap-1.5 px-2 text-[14px] disabled:opacity-100', current === 'No' && 'border-danger/40 bg-danger-soft text-danger')}
        >
          <X aria-hidden className="size-4" strokeWidth={2.25} />
          No asistiré
        </button>
      </div>
      <p aria-live="polite" className="mt-2 min-h-[20px] text-[13px] text-muted">
        {message}
      </p>
    </div>
  )
}
