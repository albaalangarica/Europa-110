'use client'

import { useActionState } from 'react'
import { saveMember } from '@/lib/actions/admin'
import { Button } from '@/components/ui/Button'
import { Notice } from '@/components/ui/States'
import type { Miembro } from '@/lib/domain/types'

const ROLES = ['Miembro', 'Editor', 'Secretaría', 'Administrador']

export function MemberForm({ member, saved }: { member: Miembro | null; saved?: boolean }) {
  const [state, action, pending] = useActionState(saveMember, null)
  return (
    <form action={action} className="grid grid-cols-2 gap-x-3 gap-y-4">
      <input type="hidden" name="_id" value={member?.id ?? ''} />
      <Field label="Usuario" hint="Es lo que sale en la lista de acceso" half>
        <input name="usuario" required defaultValue={member?.usuario} className="control" />
      </Field>
      <Field label="Nombre mostrado" half>
        <input name="nombre" defaultValue={member?.nombre} className="control" />
      </Field>
      <Field label="Grado" half>
        <select name="grado" defaultValue={member?.grado ?? 'aprendiz'} className="control">
          <option value="aprendiz">Aprendiz</option>
          <option value="companero">Compañero</option>
          <option value="maestro">Maestro</option>
        </select>
      </Field>
      <Field label="Rol" half>
        <input name="rol" list="roles" defaultValue={member?.rol ?? 'Miembro'} className="control" />
        <datalist id="roles">
          {ROLES.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
      </Field>
      <Field label="Cargos" hint="Uno o varios separados por comas: Secretario, Venerable Maestro, Primer Vigilante, Segundo Vigilante, Apoyo formación Compañeros, Apoyo formación Aprendices, Tronco de la Viuda, Tesorero, Hospitalario…">
        <input name="cargos" defaultValue={member?.cargos} className="control" />
      </Field>
      <Field label={member ? 'Nueva contraseña' : 'Contraseña'} hint={member ? 'Déjala vacía para no cambiarla. Mínimo 8 caracteres.' : 'Mínimo 8 caracteres.'}>
        <input name="password" type="password" autoComplete="new-password" minLength={8} required={!member} className="control" />
      </Field>
      <label className="col-span-2 flex min-h-tap items-center gap-3 rounded-control border border-line bg-surface px-3.5 text-[14px] font-medium">
        <input type="checkbox" name="activo" defaultChecked={member?.activo ?? true} className="size-5 accent-primary" />
        Activo (puede entrar en la app)
      </label>
      <Field label="Observaciones">
        <textarea name="observaciones" defaultValue={member?.observaciones} rows={3} className="control" />
      </Field>
      <div className="col-span-2 grid gap-3">
        {state ? <Notice tone={state.ok ? 'success' : 'danger'}>{state.message}</Notice> : saved ? <Notice tone="success">Guardado.</Notice> : null}
        <Button type="submit" block disabled={pending}>
          {pending ? 'Guardando…' : member ? 'Guardar cambios' : 'Crear miembro'}
        </Button>
      </div>
    </form>
  )
}

function Field({ label, hint, half, children }: { label: string; hint?: string; half?: boolean; children: React.ReactNode }) {
  return (
    <label className={`grid gap-1.5 text-[13px] font-semibold text-deep ${half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
      {label}
      {children}
      {hint ? <span className="text-[12.5px] font-normal text-muted">{hint}</span> : null}
    </label>
  )
}
