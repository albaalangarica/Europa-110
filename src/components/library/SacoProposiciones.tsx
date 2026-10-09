'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { Check, ExternalLink, Info, Plus, Trash2, Undo2 } from 'lucide-react'
import { addProposicion, approveProposicion, deleteProposicion } from '@/lib/actions/proposiciones'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, Notice } from '@/components/ui/States'
import { cn } from '@/lib/cn'
import type { Proposicion } from '@/lib/domain/types'

function when(value: string): string {
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Madrid' }).format(new Date(value))
}

/**
 * Saco de proposiciones: cada uno deja el enlace a su propuesta. Hasta que Secretaría, el Venerable
 * o Administración la aprueban, el resto la ve en gris como provisional.
 */
export function SacoProposiciones({ items, me, canApprove }: { items: Proposicion[]; me: string; canApprove: boolean }) {
  return (
    <div className="grid gap-3">
      <div className="flex gap-2.5 rounded-control bg-selected px-3.5 py-3 text-[13.5px] text-deep">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2} />
        <p>
          Antes de pegar un enlace de Drive, comprueba los permisos: en Drive, <strong>Compartir → Acceso general → «Cualquier persona con el enlace»</strong>.
          Si no, nadie más podrá abrirlo.
        </p>
      </div>
      <NewProposicion />
      {items.length ? (
        items.map((item) => <ProposicionCard key={item.id} item={item} mine={item.miembro_id === me} canApprove={canApprove} />)
      ) : (
        <EmptyState title="El saco está vacío">Las proposiciones que se dejen aparecerán aquí.</EmptyState>
      )}
    </div>
  )
}

function NewProposicion() {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(addProposicion, null)
  const form = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (!state?.ok) return
    form.current?.reset()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false)
  }, [state])

  if (!open)
    return (
      <>
        {state?.ok ? <Notice tone="success">{state.message}</Notice> : null}
        <Button type="button" block onClick={() => setOpen(true)}>
          <Plus aria-hidden className="size-[18px]" strokeWidth={2} /> Dejar una proposición
        </Button>
      </>
    )

  return (
    <form ref={form} action={action} className="card grid gap-3 p-4 animate-rise">
      <label className="grid gap-1.5 text-[13px] font-semibold text-deep">
        Título
        <input name="titulo" required maxLength={200} className="control" />
      </label>
      <label className="grid gap-1.5 text-[13px] font-semibold text-deep">
        Enlace de Drive
        <input name="enlace" type="url" required placeholder="https://drive.google.com/…" className="control" />
      </label>
      <label className="grid gap-1.5 text-[13px] font-semibold text-deep">
        Nota <span className="-mt-1 text-[12.5px] font-normal text-muted">(opcional)</span>
        <textarea name="nota" rows={2} maxLength={2000} className="control" />
      </label>
      {state && !state.ok ? <Notice tone="danger">{state.message}</Notice> : null}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Enviando…' : 'Enviar'}
        </Button>
      </div>
    </form>
  )
}

function ProposicionCard({ item, mine, canApprove }: { item: Proposicion; mine: boolean; canApprove: boolean }) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  // Para quien no aprueba, lo provisional se ve en gris.
  const muted = !item.aprobada && !canApprove

  function run(fn: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await fn()
      if (!result.ok) setMessage(result.message)
    })
  }

  return (
    <article className={cn('card p-4', muted && 'border-dashed bg-subtle')}>
      <div className="flex items-start gap-2">
        <h3 className={cn('min-w-0 flex-1 text-[15.5px] font-semibold leading-snug', muted && 'text-muted')}>{item.titulo}</h3>
        {item.aprobada ? (
          <StatusBadge tone="success" className="shrink-0">Aprobada</StatusBadge>
        ) : (
          <StatusBadge tone={canApprove ? 'pending' : 'neutral'} className="shrink-0">
            {canApprove ? 'Pendiente de aprobar' : 'Provisional'}
          </StatusBadge>
        )}
      </div>
      <p className="mt-1 text-[12.5px] text-muted">
        {item.autor} · {when(item.created_at)}
        {item.aprobada && item.aprobada_por ? ` · aprobada por ${item.aprobada_por}` : ''}
      </p>
      {item.nota ? <p className={cn('mt-2 whitespace-pre-line text-[14px]', muted && 'text-muted')}>{item.nota}</p> : null}

      <div className="mt-2 flex flex-wrap items-center gap-1">
        <a
          href={item.enlace}
          target="_blank"
          rel="noopener noreferrer"
          className={cn('-ml-1 inline-flex min-h-tap items-center gap-1.5 px-1 text-[14px] font-semibold', muted ? 'text-muted' : 'text-primary')}
        >
          Abrir en Drive <ExternalLink aria-hidden className="size-4" strokeWidth={1.75} />
        </a>
        <span className="flex-1" />
        {canApprove ? (
          item.aprobada ? (
            <Button type="button" variant="ghost" disabled={pending} onClick={() => run(() => approveProposicion(item.id, false))} className="px-3 text-[13.5px]">
              <Undo2 aria-hidden className="size-4" strokeWidth={1.75} /> Volver a provisional
            </Button>
          ) : (
            <Button type="button" disabled={pending} onClick={() => run(() => approveProposicion(item.id, true))} className="px-3 text-[14px]">
              <Check aria-hidden className="size-4" strokeWidth={2.25} /> Aprobar
            </Button>
          )
        ) : null}
        {canApprove || (mine && !item.aprobada) ? (
          <button
            type="button"
            disabled={pending}
            aria-label={`Retirar «${item.titulo}»`}
            onClick={() => confirm('¿Retirar esta proposición del saco?') && run(() => deleteProposicion(item.id))}
            className="grid size-tap place-items-center rounded-full text-muted hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 aria-hidden className="size-4" strokeWidth={1.75} />
          </button>
        ) : null}
      </div>
      {message ? <p className="mt-1 text-[13px] text-danger">{message}</p> : null}
    </article>
  )
}
