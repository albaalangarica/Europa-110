'use client'

import { useActionState, useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteEntity, saveEntity } from '@/lib/actions/admin'
import { DEFAULTS, ENTITIES, type EntityKey, type FieldDef } from '@/lib/admin/entities'
import { Button } from '@/components/ui/Button'
import { Notice } from '@/components/ui/States'
import { cn } from '@/lib/cn'

const GRADES = [
  { value: 'aprendiz', label: 'Aprendiz' },
  { value: 'companero', label: 'Compañero' },
  { value: 'maestro', label: 'Maestro' },
]

/** Formulario genérico de Administración. Los campos salen de src/lib/admin/entities.ts. */
export function EntityForm({
  kind,
  row,
  tenidas,
  saved,
}: {
  kind: EntityKey
  row: Record<string, unknown> | null
  tenidas: { id: string; label: string }[]
  saved?: boolean
}) {
  const def = ENTITIES[kind]
  const [state, action, pending] = useActionState(saveEntity, null)
  const [confirming, setConfirming] = useState(false)
  const [deleteMessage, setDeleteMessage] = useState('')
  const [deleting, startDelete] = useTransition()
  const id = row ? String(row.id) : ''

  function value(field: FieldDef): unknown {
    if (row) return row[field.name]
    return field.defaultValue ?? DEFAULTS[field.name] ?? (field.type === 'checkbox' ? false : '')
  }

  return (
    <>
      <form action={action} className="grid grid-cols-2 gap-x-3 gap-y-4">
        <input type="hidden" name="_kind" value={kind} />
        <input type="hidden" name="_id" value={id} />
        {def.fields.map((field) => (
          <FieldInput key={field.name} field={field} value={value(field)} tenidas={tenidas} />
        ))}
        <div className="col-span-2 grid gap-3">
          {state ? <Notice tone={state.ok ? 'success' : 'danger'}>{state.message}</Notice> : saved ? <Notice tone="success">Guardado.</Notice> : null}
          <Button type="submit" block disabled={pending}>
            {pending ? 'Guardando…' : row ? 'Guardar cambios' : `Crear ${def.singular}`}
          </Button>
        </div>
      </form>

      {row ? (
        <div className="mt-8 border-t border-line pt-5">
          {confirming ? (
            <div className="grid gap-2">
              <p className="text-[13.5px] text-muted">¿Seguro? Se borrará {def.singular === 'tenida' ? 'la tenida con sus asistencias, Tronco e invitados' : `${def.fem ? 'esta' : 'este'} ${def.singular}`}. No se puede deshacer.</p>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="secondary" onClick={() => setConfirming(false)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={deleting}
                  className="bg-danger hover:bg-danger/90"
                  onClick={() =>
                    startDelete(async () => {
                      const result = await deleteEntity(kind, id)
                      if (result && !result.ok) setDeleteMessage(result.message)
                    })
                  }
                >
                  Borrar
                </Button>
              </div>
              {deleteMessage ? <Notice tone="danger">{deleteMessage}</Notice> : null}
            </div>
          ) : (
            <Button type="button" variant="ghost" className="text-danger hover:bg-danger-soft" onClick={() => setConfirming(true)}>
              <Trash2 aria-hidden className="size-4" strokeWidth={1.75} /> Borrar {def.singular}
            </Button>
          )}
        </div>
      ) : null}
    </>
  )
}

function FieldInput({ field, value, tenidas }: { field: FieldDef; value: unknown; tenidas: { id: string; label: string }[] }) {
  const listId = field.suggestions ? `sug-${field.name}` : undefined
  const common = { name: field.name, id: `f-${field.name}`, required: field.required }
  const str = value == null ? '' : String(value)

  if (field.type === 'checkbox') {
    return (
      <label className="col-span-2 flex min-h-tap items-center gap-3 rounded-control border border-line bg-surface px-3.5 text-[14px] font-medium">
        <input type="checkbox" name={field.name} defaultChecked={Boolean(value)} className="size-5 accent-primary" />
        {field.label}
      </label>
    )
  }

  let input: React.ReactNode
  switch (field.type) {
    case 'textarea':
      input = <textarea {...common} defaultValue={str} rows={field.name === 'orden_del_dia' ? 8 : 4} className="control" />
      break
    case 'lines':
      input = <textarea {...common} defaultValue={Array.isArray(value) ? value.join('\n') : str} rows={4} className="control" placeholder="https://" />
      break
    case 'date':
      input = <input {...common} type="date" defaultValue={str.slice(0, 10)} className="control" />
      break
    case 'url':
      input = <input {...common} type="url" defaultValue={str} placeholder="https://" className="control" />
      break
    case 'grade':
      input = (
        <select {...common} defaultValue={str || 'aprendiz'} className="control">
          {GRADES.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      )
      break
    case 'select':
      input = (
        <select {...common} defaultValue={str || field.options?.[0]} className="control">
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )
      break
    case 'tenida':
      input = (
        <select {...common} defaultValue={str} className="control">
          <option value="">Sin leer todavía</option>
          {tenidas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      )
      break
    default:
      input = (
        <>
          <input {...common} type="text" defaultValue={str} list={listId} className="control" />
          {field.suggestions ? (
            <datalist id={listId}>
              {field.suggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          ) : null}
        </>
      )
  }

  return (
    <div className={cn('grid gap-1.5', field.half ? 'col-span-2 sm:col-span-1' : 'col-span-2')}>
      <label htmlFor={common.id} className="text-[13px] font-semibold text-deep">
        {field.label}
        {field.required ? <span className="text-danger"> *</span> : null}
      </label>
      {input}
      {field.hint ? <p className="text-[12.5px] text-muted">{field.hint}</p> : null}
    </div>
  )
}
