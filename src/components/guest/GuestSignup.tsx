'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { guestSignup } from '@/lib/actions/lodge'
import { Button } from '@/components/ui/Button'
import { Notice } from '@/components/ui/States'

/** Inscripción de visitantes: nombre y logia de procedencia, en una hoja modal. */
export function GuestSignup({ tenidaId, label }: { tenidaId: string; label: string }) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(guestSignup, null)
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (open) dialog.current?.showModal()
    else dialog.current?.close()
  }, [open])

  useEffect(() => {
    if (!state?.ok) return
    const timer = setTimeout(() => setOpen(false), 1400)
    return () => clearTimeout(timer)
  }, [state])

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className="flex-1">
        Apuntarse
      </Button>
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === dialog.current && setOpen(false)}
        aria-labelledby="signup-title"
        className="m-0 mt-auto w-full max-w-none rounded-t-[20px] bg-surface p-0 backdrop:bg-deep/40 sm:m-auto sm:max-w-[420px] sm:rounded-card"
      >
        {open ? (
          <form action={action} className="pb-safe grid gap-4 p-5 animate-sheet">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="signup-title" className="text-[18px] font-semibold">
                  Apuntarse a la tenida
                </h2>
                <p className="mt-0.5 text-[13.5px] text-muted">{label}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="-mr-2 -mt-1 grid size-tap place-items-center rounded-full text-muted hover:bg-subtle">
                <X aria-hidden className="size-5" strokeWidth={1.75} />
              </button>
            </div>
            <input type="hidden" name="tenidaId" value={tenidaId} />
            <label className="grid gap-1.5 text-[13px] font-semibold text-deep">
              Nombre
              <input name="nombre" type="text" autoComplete="name" maxLength={120} required autoFocus className="control" />
            </label>
            <label className="grid gap-1.5 text-[13px] font-semibold text-deep">
              Logia de procedencia
              <input name="logia" type="text" autoComplete="organization" maxLength={160} required className="control" />
            </label>
            {state ? <Notice tone={state.ok ? 'success' : 'danger'}>{state.message}</Notice> : null}
            <Button type="submit" block disabled={pending}>
              {pending ? 'Enviando…' : 'Enviar inscripción'}
            </Button>
          </form>
        ) : null}
      </dialog>
    </>
  )
}
