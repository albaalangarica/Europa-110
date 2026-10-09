'use client'

import { SearchX } from 'lucide-react'
import { SearchList } from '@/components/ui/SearchList'
import { EmptyState } from '@/components/ui/States'
import type { Plancha } from '@/lib/domain/types'
import { LibraryCard } from './LibraryCard'

const fields = (p: Plancha) => [p.titulo, p.autor, p.tema, p.resumen, p.curso, p.grado]

export function PlanchasBrowser({ items }: { items: Plancha[] }) {
  return (
    <SearchList
      items={items}
      fields={fields}
      placeholder="Buscar título, autor o tema"
      label="Buscar planchas"
      empty={<EmptyState icon={SearchX} title="No se han encontrado planchas" />}
      render={(p) => (
        <LibraryCard key={p.id} fecha={p.fecha} tag={p.grado} title={p.titulo} meta={[p.autor, p.tema]} summary={p.resumen} href={p.enlace} action="Abrir plancha" />
      )}
    />
  )
}
