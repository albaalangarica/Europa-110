'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { normalizeText } from '@/lib/domain/text'

/** Buscador instantáneo (sin tildes) sobre una lista ya cargada. */
export function SearchList<T>({
  items,
  fields,
  placeholder,
  label,
  render,
  empty,
}: {
  items: T[]
  fields: (item: T) => string[]
  placeholder: string
  label: string
  render: (item: T) => ReactNode
  empty: ReactNode
}) {
  const [query, setQuery] = useState('')
  const q = normalizeText(query)
  const visible = useMemo(() => (q ? items.filter((item) => normalizeText(fields(item).join(' ')).includes(q)) : items), [items, fields, q])

  return (
    <>
      <div className="relative mb-4">
        <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted" strokeWidth={1.75} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          className="control pl-10"
        />
      </div>
      {visible.length ? <div className="grid gap-2.5">{visible.map(render)}</div> : empty}
    </>
  )
}
