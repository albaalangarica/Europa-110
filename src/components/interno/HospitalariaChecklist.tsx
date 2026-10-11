'use client'

import { useState, useTransition } from 'react'
import { Check, NotebookPen } from 'lucide-react'
import { desmarcarContacto, marcarContacto } from '@/lib/actions/hospitalaria'
import { cn } from '@/lib/cn'
import type { ContactoItem } from '@/lib/data/hospitalaria'

function day(iso: string): string {
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'Europe/Madrid' }).format(new Date(iso))
}

/** Checklist de la Hospitalaria: a quién ha llamado entre esta tenida y la siguiente. */
export function HospitalariaChecklist({ items, hasta }: { items: ContactoItem[]; hasta: string }) {
  const done = items.filter((i) => i.actual).length
  const pct = items.length ? Math.round((done / items.length) * 100) : 0
  return (
    <div className="card overflow-hidden">
      <div className="p-4">
        <p className="text-[14.5px] font-semibold">
          {done} de {items.length} contactados
        </p>
        <p className="text-[13px] text-muted">{hasta}</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-subtle" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso">
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <ul className="divide-y divide-line border-t border-line">
        {items.map((item) => (
          <Row key={item.id} item={item} />
        ))}
      </ul>
    </div>
  )
}

function Row({ item }: { item: ContactoItem }) {
  const [pending, startTransition] = useTransition()
  const [noting, setNoting] = useState(false)
  const [nota, setNota] = useState(item.actual?.nota ?? '')
  const [error, setError] = useState('')
  const checked = Boolean(item.actual)

  function run(fn: () => Promise<{ ok: boolean; message: string }>, after?: () => void) {
    startTransition(async () => {
      const result = await fn()
      if (result.ok) {
        setError('')
        after?.()
      } else setError(result.message)
    })
  }

  return (
    <li className="px-4 py-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          aria-label={`${item.nombre}: ${checked ? 'contactado' : 'sin contactar'}`}
          disabled={pending}
          onClick={() => run(() => (checked ? desmarcarContacto(item.id) : marcarContacto(item.id, nota)))}
          className="grid size-tap shrink-0 place-items-center"
        >
          <span
            className={cn(
              'grid size-6 place-items-center rounded-[7px] border-2 transition-colors',
              checked ? 'border-primary bg-primary text-white' : 'border-line-strong bg-surface',
            )}
          >
            {checked ? <Check aria-hidden className="size-4" strokeWidth={3} /> : null}
          </span>
        </button>
        <div className="min-w-0 flex-1 leading-tight">
          <p className={cn('text-[15px] font-medium', checked && 'text-muted')}>{item.nombre}</p>
          <p className="text-[12.5px] text-muted">
            {item.actual
              ? `Contactado el ${day(item.actual.fecha)}`
              : item.anterior
                ? `Último contacto: ${day(item.anterior)}`
                : 'Sin contactos anteriores'}
          </p>
          {item.actual?.nota && !noting ? <p className="mt-1 whitespace-pre-line text-[13.5px] text-ink">{item.actual.nota}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => setNoting((v) => !v)}
          aria-label={`Nota sobre ${item.nombre}`}
          aria-expanded={noting}
          className={cn('grid size-tap shrink-0 place-items-center rounded-full hover:bg-subtle', item.actual?.nota ? 'text-primary' : 'text-muted')}
        >
          <NotebookPen aria-hidden className="size-[18px]" strokeWidth={1.75} />
        </button>
      </div>
      {noting ? (
        <form
          className="mb-1 mt-1 grid gap-2 pl-[56px]"
          onSubmit={(e) => {
            e.preventDefault()
            run(() => marcarContacto(item.id, nota), () => setNoting(false))
          }}
        >
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Cómo está, si necesita algo…"
            aria-label={`Texto de la nota sobre ${item.nombre}`}
            className="control"
          />
          <button type="submit" disabled={pending} className="min-h-tap justify-self-start rounded-control bg-primary px-4 text-[14px] font-semibold text-white disabled:opacity-60">
            {checked ? 'Guardar nota' : 'Marcar como contactado'}
          </button>
        </form>
      ) : null}
      {error ? <p className="pl-[56px] text-[13px] text-danger">{error}</p> : null}
    </li>
  )
}
