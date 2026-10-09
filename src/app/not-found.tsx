import { SearchX } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/States'

export default function NotFound() {
  return (
    <main className="mx-auto max-w-[640px] px-gutter pt-16">
      <EmptyState icon={SearchX} title="No se ha encontrado">
        Puede que ya no exista o que no tengas acceso.
      </EmptyState>
      <div className="mt-4 flex justify-center">
        <ButtonLink href="/" variant="secondary">
          Volver a la agenda
        </ButtonLink>
      </div>
    </main>
  )
}
