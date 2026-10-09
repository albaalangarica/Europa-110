'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { publishFormation } from '@/lib/actions/lodge'
import { Button } from '@/components/ui/Button'
import { Notice } from '@/components/ui/States'

/** Publicar una convocatoria de formación: título, fecha opcional, nota y enlaces en orden. */
export function PublishFormation({ level, audience }: { level: 'Compañero' | 'Aprendiz'; audience: string }) {
  const [open, setOpen] = useState(false)
  const [links, setLinks] = useState(1)
  const [state, action, pending] = useActionState(publishFormation, null)
  const form = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.ok) {
      form.current?.reset()
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLinks(1)
    }
  }, [state])

  if (!open) {
    return (
      <Button type="button" block onClick={() => setOpen(true)} aria-expanded={false}>
        <Plus aria-hidden className="size-[18px]" strokeWidth={2} /> Publicar formación
      </Button>
    )
  }

  return (
    <form ref={form} action={action} className="card grid gap-4 p-4 animate-rise">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-semibold">Nueva formación</h2>
        <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar formulario" className="-mr-2 grid size-tap place-items-center rounded-full text-muted hover:bg-subtle">
          <X aria-hidden className="size-5" strokeWidth={1.75} />
        </button>
      </div>
      <input type="hidden" name="nivel" value={level} />
      <Field label="Título">
        <input name="titulo" type="text" required className="control" />
      </Field>
      <Field label="Fecha de la formación" hint="opcional">
        <input name="fecha" type="date" className="control" />
      </Field>
      <Field label="Nota">
        <textarea name="nota" rows={4} placeholder={`Indicaciones para los ${audience}`} className="control" />
      </Field>
      <div className="grid gap-2">
        {Array.from({ length: links }, (_, i) => (
          <Field key={i} label={links > 1 ? `Enlace ${i + 1}` : 'Enlace'}>
            <input name="enlace" type="url" placeholder="https://" className="control" />
          </Field>
        ))}
        <Button type="button" variant="ghost" onClick={() => setLinks((n) => n + 1)} className="justify-self-start px-2">
          <Plus aria-hidden className="size-4" strokeWidth={2} /> Añadir otro enlace
        </Button>
      </div>
      {state ? <Notice tone={state.ok ? 'success' : 'danger'}>{state.message}</Notice> : null}
      <Button type="submit" block disabled={pending}>
        {pending ? 'Publicando…' : 'Publicar formación'}
      </Button>
    </form>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-[13px] font-semibold text-deep">
      <span>
        {label} {hint ? <span className="font-normal text-muted">({hint})</span> : null}
      </span>
      {children}
    </label>
  )
}
