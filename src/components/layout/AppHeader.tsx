import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import logo from '../../../public/icons/icon-192.png'

/**
 * Cabecera compacta: logotipo original, marca y título de la sección; a la derecha, el perfil.
 * En las fichas de detalle muestra "volver" en lugar del logotipo.
 */
export function AppHeader({
  title,
  initial,
  back,
}: {
  title: string
  initial: string
  back?: { href: string; label: string }
}) {
  return (
    <header className="pt-safe sticky top-0 z-20 border-b border-line bg-canvas/95 backdrop-blur supports-[backdrop-filter]:bg-canvas/85">
      <div className="mx-auto flex h-header max-w-[640px] items-center gap-3 px-gutter">
        {back ? (
          <Link
            href={back.href}
            aria-label={`Volver a ${back.label}`}
            className="-ml-2.5 grid size-tap shrink-0 place-items-center rounded-full text-deep hover:bg-subtle"
          >
            <ChevronLeft aria-hidden className="size-6" strokeWidth={1.75} />
          </Link>
        ) : (
          <Link href="/" aria-label="EUROPA 110 · Agenda" className="shrink-0">
            <Image src={logo} alt="" width={30} height={30} priority className="size-[30px] rounded-[7px]" />
          </Link>
        )}
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[10.5px] font-semibold tracking-[0.18em] text-muted">{back ? back.label.toUpperCase() : 'EUROPA 110'}</p>
          <h1 className="truncate text-[17px] font-semibold tracking-[-0.01em] text-ink">{title}</h1>
        </div>
        <Link
          href="/perfil"
          aria-label="Perfil"
          className="grid size-tap shrink-0 place-items-center rounded-full"
        >
          <span className="grid size-9 place-items-center rounded-full bg-deep text-[14px] font-semibold text-white">{initial || '·'}</span>
        </Link>
      </div>
    </header>
  )
}

/** Contenedor de cada pantalla, con los márgenes laterales del sistema. */
export function Page({ children }: { children: React.ReactNode }) {
  return <main className="pb-nav mx-auto w-full max-w-[640px] px-gutter pt-5 animate-fade">{children}</main>
}
