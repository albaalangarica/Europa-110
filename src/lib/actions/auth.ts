'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/admin'
import { normalizeText } from '@/lib/domain/text'
import type { ActionResult } from '@/lib/domain/types'
import { actionMember, failure, NOT_AUTHENTICATED, success, text, UNEXPECTED } from './helpers'

const WRONG = failure('Usuario o contraseña incorrectos.')

function safeNext(value: string): string {
  return value.startsWith('/') && !value.startsWith('//') ? value : '/'
}

export async function signIn(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const usuario = normalizeText(text(form, 'username', 80))
  const password = String(form.get('password') ?? '')
  if (!usuario || !password) return failure('Introduce usuario y contraseña.')

  try {
    const { data: members, error } = await db().from('miembros').select('id, usuario, activo').eq('activo', true)
    if (error) throw error
    const member = (members as { id: string; usuario: string }[]).find((m) => normalizeText(m.usuario) === usuario)
    if (!member) return WRONG

    const { data: authUser } = await db().auth.admin.getUserById(member.id)
    const email = authUser?.user?.email
    if (!email) return WRONG

    const supabase = await createSupabaseServerClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) return WRONG

    await db().from('miembros').update({ ultimo_acceso: new Date().toISOString() }).eq('id', member.id)
  } catch (error) {
    console.error('[acceso]', error)
    return failure('No se ha podido conectar con el servidor.')
  }

  redirect(safeNext(text(form, 'next', 300)))
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/acceso')
}

export async function changePassword(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const member = await actionMember()
  if (!member) return NOT_AUTHENTICATED

  const current = String(form.get('current') ?? '')
  const next = String(form.get('password') ?? '')
  const confirm = String(form.get('confirm') ?? '')
  if (!next) return failure('Escribe la nueva contraseña.')
  if (next !== confirm) return failure('Las dos contraseñas no coinciden.')
  if (next === current) return failure('La nueva contraseña tiene que ser distinta de la actual.')

  try {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()
    const email = data.user?.email
    if (!email) return NOT_AUTHENTICATED
    // Se comprueba la contraseña actual antes de cambiarla.
    const { error: wrong } = await supabase.auth.signInWithPassword({ email, password: current })
    if (wrong) return failure('La contraseña actual no es correcta.')
    // Sin mínimo de longitud: cada uno pone la que quiera (ver supabase/migrations/…_cambiar_clave.sql).
    const { error } = await db().rpc('cambiar_clave', { miembro: member.id, clave: next })
    if (error?.code === 'PGRST202') {
      // Falta ejecutar la migración: Supabase exige entonces al menos 6 caracteres.
      if (next.length < 6) return failure('De momento la contraseña debe tener al menos 6 caracteres.')
      const { error: authError } = await supabase.auth.updateUser({ password: next })
      if (authError) throw authError
    } else if (error) throw error
    const { error: flagError } = await db().from('miembros').update({ debe_cambiar_clave: false }).eq('id', member.id)
    if (flagError) throw flagError
    revalidatePath('/', 'layout')
    return success('Contraseña cambiada.')
  } catch (error) {
    console.error('[contraseña]', error)
    return UNEXPECTED
  }
}
