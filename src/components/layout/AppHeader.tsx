import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, KeyRound } from 'lucide-react'
import { getCurrentMember } from '@/lib/auth/session'
import logo from '../../../public/icons/icon-192.png'
import { AvisosBell } from '@/components/avisos/AvisosBell'

/**
 * Cabecera compacta: logotipo original, marca y título de la sección; a la derecha, el perfil.
 * En las fichas de detalle muestra "volver" en lugar del logotipo.
 */
export async function AppHeader({
  title,
  initial,
  back,
}: {
  title: string
  initial: string
  back?: { href: string; label: string }
}) {
  // Aviso de contraseña provisional en todas las pantallas salvo el propio perfil.
  const member = await getCurrentMember()
  const notice = member?.debe_cambiar_clave && title !== 'Perfil'
  return (
    <header className="pt-safe sticky top-0 z-20 border-b border-line bg-canvas/95 backdrop-blur supports-[backdrop-filter]:bg-canvas/85 md:static md:border-0 md:bg-transparent md:pt-0 md:backdrop-blur-none">
      <div className="mx-auto flex h-header max-w-[640px] items-center gap-3 px-gutter md:h-auto md:max-w-3xl md:px-8 md:pt-8">
        {back ? (
          <Link
            href={back.href}
            aria-label={`Volver a ${back.label}`}
            className="-ml-2.5 grid size-tap shrink-0 place-items-center rounded-full text-deep hover:bg-subtle"
          >
            <ChevronLeft aria-hidden className="size-6" strokeWidth={1.75} />
          </Link>
        ) : (
          <Link href="/" aria-label="EUROPA 110 · Agenda" className="shrink-0 md:hidden">
            <Image src={logo} alt="" width={30} height={30} priority className="size-[30px] rounded-[7px]" />
          </Link>
        )}
        <div className="min-w-0 flex-1 leading-tight">
          <p className={back ? 'text-[10.5px] font-semibold tracking-[0.18em] text-muted' : 'text-[10.5px] font-semibold tracking-[0.18em] text-muted md:hidden'}>
            {back ? back.label.toUpperCase() : 'EUROPA 110'}
          </p>
          <h1 className="truncate text-[17px] font-semibold tracking-[-0.01em] text-ink md:text-[28px] md:tracking-[-0.02em]">{title}</h1>
        </div>
        <AvisosBell className="-mr-1 md:hidden" />
        <Link
          href="/perfil"
          aria-label="Perfil"
          className="grid size-tap shrink-0 place-items-center rounded-full md:hidden"
        >
          <span className="grid size-9 place-items-center rounded-full bg-deep text-[14px] font-semibold text-white">{initial || '·'}</span>
        </Link>
      </div>
      {notice ? (
        <div className="mx-auto max-w-[640px] px-gutter pb-2.5 md:max-w-3xl md:px-8 md:pb-0 md:pt-4">
          <Link href="/perfil#contrasena" className="flex min-h-tap items-center gap-2.5 rounded-control bg-deep px-3.5 py-2 text-[13px] leading-snug text-white">
            <KeyRound aria-hidden className="size-[18px] shrink-0 text-selected" strokeWidth={1.75} />
            <span className="min-w-0 flex-1">
              <strong className="font-semibold">Estás usando la contraseña provisional.</strong> Toca aquí para poner una tuya.
            </span>
            <ChevronRight aria-hidden className="size-4 shrink-0 opacity-70" strokeWidth={1.75} />
          </Link>
        </div>
      ) : null}
    </header>
  )
}

/** Contenedor de cada pantalla, con los márgenes laterales del sistema. */
export function Page({ children }: { children: React.ReactNode }) {
  return <main className="pb-nav mx-auto w-full max-w-[640px] px-gutter pt-5 animate-fade md:max-w-3xl md:px-8 md:pt-6">{children}</main>
}
