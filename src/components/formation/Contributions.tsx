'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { ExternalLink, Link2, Pencil, Trash2 } from 'lucide-react'
import { addContribution, deleteContribution, updateContribution } from '@/lib/actions/aportaciones'
import { Button } from '@/components/ui/Button'
import { Notice } from '@/components/ui/States'
import type { Aportacion } from '@/lib/domain/types'

function when(value: string): string {
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' }).format(new Date(value))
}

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** Reflexiones y enlaces de los hermanos en una formación. */
export function Contributions({
  formacionId,
  items,
  me,
  canModerate,
}: {
  formacionId: string
  items: Aportacion[]
  me: string
  canModerate: boolean
}) {
  return (
    <div className="grid gap-2.5">
      <ContributionForm formacionId={formacionId} />
      {items.length ? (
        items.map((item) => <ContributionItem key={item.id} item={item} mine={item.miembro_id === me} canDelete={item.miembro_id === me || canModerate} />)
      ) : (
        <p className="px-1 py-2 text-[13.5px] text-muted">Todavía no hay aportaciones. Puedes ser el primero en compartir una reflexión o un enlace.</p>
      )}
    </div>
  )
}

function Fields({ texto = '', enlace = '' }: { texto?: string; enlace?: string }) {
  return (
    <>
      <label className="grid gap-1.5 text-[13px] font-semibold text-deep">
        Reflexión
        <textarea name="texto" rows={3} maxLength={4000} defaultValue={texto} placeholder="Escribe lo que quieras compartir…" className="control" />
      </label>
      <label className="grid gap-1.5 text-[13px] font-semibold text-deep">
        Enlace <span className="-mt-1 text-[12.5px] font-normal text-muted">Drive, YouTube, un artículo… (opcional)</span>
        <input name="enlace" type="url" defaultValue={enlace} placeholder="https://" className="control" />
      </label>
    </>
  )
}

function ContributionForm({ formacionId }: { formacionId: string }) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(addContribution, null)
  const form = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (!state?.ok) return
    form.current?.reset()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false)
  }, [state])

  if (!open) {
    return (
      <>
        {state?.ok ? <Notice tone="success">{state.message}</Notice> : null}
        <Button type="button" variant="secondary" block onClick={() => setOpen(true)}>
          Añadir una aportación
        </Button>
      </>
    )
  }

  return (
    <form ref={form} action={action} className="card grid gap-3 p-4 animate-rise">
      <input type="hidden" name="formacionId" value={formacionId} />
      <Fields />
      {state && !state.ok ? <Notice tone="danger">{state.message}</Notice> : null}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Publicando…' : 'Publicar'}
        </Button>
      </div>
    </form>
  )
}

function ContributionItem({ item, mine, canDelete }: { item: Aportacion; mine: boolean; canDelete: boolean }) {
  const [editing, setEditing] = useState(false)
  const [state, action, pending] = useActionState(updateContribution, null)
  const [deleting, startDelete] = useTransition()
  const [error, setError] = useState('')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.ok) setEditing(false)
  }, [state])

  return (
    <article className="card p-4">
      <header className="flex items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-selected text-[13px] font-semibold text-primary">{item.autor.charAt(0).toUpperCase()}</span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[14px] font-semibold">{item.autor}</p>
          <p className="text-[12px] text-muted">
            {when(item.created_at)}
            {item.updated_at !== item.created_at ? ' · editada' : ''}
          </p>
        </div>
        {mine && !editing ? (
          <button type="button" onClick={() => setEditing(true)} aria-label="Editar mi aportación" className="grid size-tap place-items-center rounded-full text-muted hover:bg-subtle">
            <Pencil aria-hidden className="size-4" strokeWidth={1.75} />
          </button>
        ) : null}
        {canDelete && !editing ? (
          <button
            type="button"
            disabled={deleting}
            aria-label={mine ? 'Borrar mi aportación' : `Quitar la aportación de ${item.autor}`}
            onClick={() => {
              if (!confirm(mine ? '¿Borrar tu aportación?' : `¿Quitar la aportación de ${item.autor}?`)) return
              startDelete(async () => {
                const result = await deleteContribution(item.id)
                if (!result.ok) setError(result.message)
              })
            }}
            className="-mr-2 grid size-tap place-items-center rounded-full text-muted hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 aria-hidden className="size-4" strokeWidth={1.75} />
          </button>
        ) : null}
      </header>

      {editing ? (
        <form action={action} className="mt-3 grid gap-3">
          <input type="hidden" name="id" value={item.id} />
          <Fields texto={item.texto} enlace={item.enlace} />
          {state && !state.ok ? <Notice tone="danger">{state.message}</Notice> : null}
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              Guardar
            </Button>
          </div>
        </form>
      ) : (
        <>
          {item.texto ? <p className="mt-3 whitespace-pre-line text-[14.5px] leading-relaxed">{item.texto}</p> : null}
          {item.enlace ? (
            <a
              href={item.enlace}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex min-h-tap items-center gap-2.5 rounded-control border border-line px-3 py-2 hover:bg-subtle"
            >
              <Link2 aria-hidden className="size-4 shrink-0 text-primary" strokeWidth={1.75} />
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{host(item.enlace)}</span>
              <ExternalLink aria-hidden className="size-4 shrink-0 text-muted" strokeWidth={1.75} />
            </a>
          ) : null}
        </>
      )}
      {error ? <p className="mt-2 text-[13px] text-danger">{error}</p> : null}
    </article>
  )
}
