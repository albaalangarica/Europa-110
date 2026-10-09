import type { Metadata } from 'next'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import logo from '../../../public/icons/icon-192.png'
import { getCurrentMember } from '@/lib/auth/session'
import { getLoginUsers } from '@/lib/data/members'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = { title: 'Retejo' }

export default async function AccesoPage({ searchParams }: PageProps<'/acceso'>) {
  const { next, caducada } = await searchParams
  if (await getCurrentMember()) redirect('/')

  let users: { usuario: string; nombre: string }[] = []
  try {
    users = await getLoginUsers()
  } catch (error) {
    console.error('[acceso] lista de usuarios', error)
  }

  return (
    <main className="pt-safe pb-safe grid min-h-dvh place-items-center px-gutter py-10">
      <div className="w-full max-w-[360px] animate-rise">
        <Image src={logo} alt="Europa 110" width={60} height={60} priority className="mx-auto size-[60px] rounded-[13px]" />
        <h1 className="mt-5 text-center text-[24px] font-semibold tracking-[0.06em]">EUROPA 110</h1>
        <p className="mb-8 mt-1.5 text-center text-[13px] font-medium tracking-[0.2em] text-muted uppercase">Retejo</p>
        <LoginForm users={users} next={typeof next === 'string' ? next : '/'} expired={caducada === '1'} />
      </div>
    </main>
  )
}
