'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { signIn } from '@/lib/actions/auth'
import { Button } from '@/components/ui/Button'
import { Notice } from '@/components/ui/States'
import type { ActionResult } from '@/lib/domain/types'

const LAST_USER_KEY = 'europa110_last_user'

export function LoginForm({ users, next, expired }: { users: { usuario: string; nombre: string }[]; next: string; expired: boolean }) {
  const [username, setUsername] = useState('')
  const [state, setState] = useState<ActionResult | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    // Se recuerda quién entró la última vez en este dispositivo.
    try {
      const last = localStorage.getItem(LAST_USER_KEY) || ''
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (users.some((u) => u.usuario === last)) setUsername(last)
    } catch {
      // Sin almacenamiento local.
    }
  }, [users])

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      localStorage.setItem(LAST_USER_KEY, String(form.get('username') ?? ''))
    } catch {
      // Sin almacenamiento local.
    }
    startTransition(async () => {
      const result = await signIn(null, form)
      // Si todo va bien, la acción redirige y no devuelve nada.
      if (result) setState(result)
    })
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="grid gap-1.5 text-[13px] font-semibold text-deep">
        Usuario
        {users.length ? (
          <select name="username" required value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" className="control appearance-none">
            <option value="" disabled>
              Selecciona tu nombre
            </option>
            {users.map((u) => (
              <option key={u.usuario} value={u.usuario}>
                {u.nombre}
              </option>
            ))}
          </select>
        ) : (
          // Sin lista disponible, se deja escribir el usuario a mano.
          <input name="username" required autoComplete="username" placeholder="Tu usuario" className="control" />
        )}
      </label>
      <label className="grid gap-1.5 text-[13px] font-semibold text-deep">
        Contraseña
        <input name="password" type="password" required autoComplete="current-password" className="control" />
      </label>
      {state && !state.ok ? <Notice tone="danger">{state.message}</Notice> : null}
      {!state && expired ? <Notice>La sesión ha caducado. Vuelve a entrar.</Notice> : null}
      <Button type="submit" block disabled={pending} className="mt-1">
        {pending ? 'Entrando…' : 'Entrar'}
      </Button>
      <Link href="/invitados" className="mx-auto inline-flex min-h-tap items-center px-3 text-[14px] font-semibold text-primary">
        Continuar como invitado
      </Link>
    </form>
  )
}
