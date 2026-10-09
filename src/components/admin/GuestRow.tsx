'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteGuest } from '@/lib/actions/admin'

export function DeleteGuestButton({ id, name }: { id: number; name: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`Eliminar la inscripción de ${name}`}
      onClick={() => {
        if (confirm(`¿Eliminar la inscripción de ${name}?`)) startTransition(async () => void (await deleteGuest(id)))
      }}
      className="grid size-tap shrink-0 place-items-center rounded-full text-muted hover:bg-danger-soft hover:text-danger"
    >
      <Trash2 aria-hidden className="size-4" strokeWidth={1.75} />
    </button>
  )
}
