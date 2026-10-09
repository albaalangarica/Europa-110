import 'server-only'
import { getCurrentMember, type CurrentMember } from '@/lib/auth/session'
import type { ActionResult } from '@/lib/domain/types'

export const failure = (message: string): ActionResult => ({ ok: false, message })
export const success = (message: string): ActionResult => ({ ok: true, message })

export const NOT_AUTHENTICATED = failure('La sesión ha caducado. Vuelve a entrar.')
export const UNEXPECTED = failure('No se ha podido guardar. Inténtalo de nuevo en unos segundos.')

/** Persona autorizada de la acción, o null. Las acciones nunca se fían de lo que diga el navegador sobre quién es. */
export async function actionMember(): Promise<CurrentMember | null> {
  return getCurrentMember()
}

export function text(form: FormData, name: string, max = 4000): string {
  return String(form.get(name) ?? '').trim().slice(0, max)
}
