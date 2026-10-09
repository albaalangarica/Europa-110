'use client'

import { useState, useTransition } from 'react'
import { ChevronRight } from 'lucide-react'
import { saveAttendanceFor } from '@/lib/actions/lodge'
import { cn } from '@/lib/cn'
import type { AttendanceSummary, Respuesta } from '@/lib/domain/types'

/** Secretaría marca la asistencia de cualquiera, sin el límite de 10 días. */
export function AdminAttendance({ row }: { row: AttendanceSummary }) {
  const [answers, setAnswers] = useState(() => new Map(row.personas.map((p) => [p.id, p.respuesta])))
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()

  function mark(id: string, value: Respuesta) {
    setMessage('Guardando…')
    startTransition(async () => {
      const result = await saveAttendanceFor(row.tenidaId, id, value)
      if (result.ok) setAnswers((prev) => new Map(prev).set(id, value))
      setMessage(result.message)
    })
  }

  return (
    <details className="mt-3 overflow-hidden rounded-control border border-line">
      <summary className="flex min-h-tap cursor-pointer items-center gap-2 px-3.5 text-[14px] font-semibold text-deep hover:bg-subtle">
        <ChevronRight aria-hidden className="rotate-open size-4 text-muted transition-transform" strokeWidth={2} />
        Marcar asistencia
      </summary>
      <ul className="divide-y divide-line border-t border-line">
        {row.personas.map((person) => {
          const current = answers.get(person.id) ?? ''
          return (
            <li key={person.id} className="flex items-center gap-3 px-3.5 py-1.5">
              <span className="min-w-0 flex-1 truncate text-[14px]">{person.nombre}</span>
              {(['Sí', 'No'] as const).map((answer) => (
                <button
                  key={answer}
                  type="button"
                  disabled={pending}
                  onClick={() => mark(person.id, answer)}
                  aria-pressed={current === answer}
                  aria-label={`${person.nombre}: ${answer === 'Sí' ? 'asiste' : 'no asiste'}`}
                  className={cn(
                    'min-h-tap min-w-tap rounded-control border text-[14px] font-semibold transition-colors',
                    current === answer
                      ? answer === 'Sí'
                        ? 'border-primary bg-primary text-white'
                        : 'border-danger bg-danger-soft text-danger'
                      : 'border-line-strong bg-surface text-muted hover:bg-subtle',
                  )}
                >
                  {answer}
                </button>
              ))}
            </li>
          )
        })}
      </ul>
      <p aria-live="polite" className="min-h-[18px] px-3.5 pb-2 text-[13px] text-muted">
        {message}
      </p>
    </details>
  )
}
