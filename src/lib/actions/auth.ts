'use server'

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
  if (next.length < 8) return failure('La nueva contraseña debe tener al menos 8 caracteres.')
  if (next !== confirm) return failure('Las dos contraseñas no coinciden.')

  try {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()
    const email = data.user?.email
    if (!email) return NOT_AUTHENTICATED
    // Se comprueba la contraseña actual antes de cambiarla.
    const { error: wrong } = await supabase.auth.signInWithPassword({ email, password: current })
    if (wrong) return failure('La contraseña actual no es correcta.')
    const { error } = await supabase.auth.updateUser({ password: next })
    if (error) throw error
    return success('Contraseña cambiada.')
  } catch (error) {
    console.error('[contraseña]', error)
    return UNEXPECTED
  }
}
