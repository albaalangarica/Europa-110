'use client'

import { useActionState, useEffect, useRef } from 'react'
import { changePassword } from '@/lib/actions/auth'
import { Button } from '@/components/ui/Button'
import { Notice } from '@/components/ui/States'

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, null)
  const form = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state?.ok) form.current?.reset()
  }, [state])

  return (
    <form ref={form} action={action} className="grid gap-3">
      <Field label="Contraseña actual" name="current" autoComplete="current-password" />
      <Field label="Nueva contraseña" name="password" autoComplete="new-password" minLength={8} />
      <Field label="Repite la nueva contraseña" name="confirm" autoComplete="new-password" minLength={8} />
      {state ? <Notice tone={state.ok ? 'success' : 'danger'}>{state.message}</Notice> : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? 'Guardando…' : 'Cambiar contraseña'}
      </Button>
    </form>
  )
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<'input'>) {
  return (
    <label className="grid gap-1.5 text-[13px] font-semibold text-deep">
      {label}
      <input type="password" required className="control" {...props} />
    </label>
  )
}
