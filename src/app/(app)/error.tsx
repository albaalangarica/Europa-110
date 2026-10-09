'use client'

import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/States'

export default function PrivateError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-[640px] px-gutter pt-10">
      <ErrorState
        message="Comprueba la conexión e inténtalo de nuevo."
        action={
          <Button type="button" onClick={reset}>
            Reintentar
          </Button>
        }
      />
    </main>
  )
}
