import { normalizeText } from './text'
import type { Grado, Miembro } from './types'

/*
 * Cargos, permisos y visibilidad. Es la misma lógica que tenía Code.gs:
 * la columna "Cargos" admite varios separados por comas y también cuenta la columna "Rol".
 */

export const FORMATION_LEVELS = ['Compañero', 'Aprendiz'] as const
export type FormationLevel = (typeof FORMATION_LEVELS)[number]

export const GRADE_LABEL: Record<Grado, string> = {
  aprendiz: 'Aprendiz',
  companero: 'Compañero',
  maestro: 'Maestro',
}

const GRADE_RANK: Record<string, number> = { aprendiz: 1, companero: 2, maestro: 3 }

export function gradeRank(value: unknown): number {
  return GRADE_RANK[normalizeText(value)] ?? 0
}

export function parseGrade(value: unknown): Grado | null {
  const key = normalizeText(value)
  return key === 'aprendiz' || key === 'companero' || key === 'maestro' ? key : null
}

type UserLike = Pick<Miembro, 'usuario' | 'grado' | 'rol' | 'cargos'>

export function userCargos(user: Pick<Miembro, 'cargos'> | null | undefined): string[] {
  return String(user?.cargos ?? '')
    .split(/[,;|\n]/)
    .map((v) => v.trim())
    .filter(Boolean)
}

function hasCargo(user: UserLike, keyword: string): boolean {
  return normalizeText(user.rol).includes(keyword) || userCargos(user).some((cargo) => normalizeText(cargo).includes(keyword))
}

export interface Permisos {
  secretaria: boolean
  venerable: boolean
  gestion: boolean
  // Secretaría puede marcar la asistencia de cualquiera.
  asistencia: boolean
  primerVigilante: boolean
  segundoVigilante: boolean
  tronco: boolean
  formacion: { publicar: FormationLevel[]; ver: FormationLevel[] }
  // Edita tenidas, planchas, documentos, convocatorias y usuarios (antes se hacía en el Sheet).
  administracion: boolean
  // Aprueba lo que se deja en el Saco de proposiciones: Secretaría, Venerable y Administración.
  aprobarProposiciones: boolean
}

export function permissionsFor(user: UserLike): Permisos {
  const secretaria = hasCargo(user, 'secretari')
  const venerable = hasCargo(user, 'venerable')
  const primerVigilante = hasCargo(user, 'primer vigilante')
  const segundoVigilante = hasCargo(user, 'segundo vigilante')
  const administrador = normalizeText(user.rol) === 'administrador'

  const publicar: FormationLevel[] = []
  if (primerVigilante || hasCargo(user, 'formacion companeros')) publicar.push('Compañero')
  if (segundoVigilante || hasCargo(user, 'formacion aprendices')) publicar.push('Aprendiz')

  // Cada Compañero y cada Aprendiz ve las formaciones de su grado.
  const ver = [...publicar]
  const grado = normalizeText(GRADE_LABEL[user.grado] ?? user.grado)
  for (const level of FORMATION_LEVELS) {
    if (grado === normalizeText(level) && !ver.includes(level)) ver.push(level)
  }

  return {
    secretaria,
    venerable,
    gestion: secretaria || venerable,
    asistencia: secretaria,
    primerVigilante,
    segundoVigilante,
    tronco: administrador || secretaria || hasCargo(user, 'tronco') || hasCargo(user, 'tesorer') || hasCargo(user, 'hospitalari'),
    formacion: { publicar, ver },
    administracion: administrador,
    aprobarProposiciones: secretaria || venerable || administrador,
  }
}

export interface Visibility {
  grado_minimo: Grado | string | null
  visible_para?: string | null
}

export function isVisibleForUser(row: Visibility, user: UserLike): boolean {
  const minGrade = gradeRank(row.grado_minimo)
  if (!minGrade) return false
  if (gradeRank(user.grado) < minGrade) return false

  const visibleFor = normalizeText(row.visible_para || 'todos')
  if (!visibleFor || visibleFor === 'todos') return true

  const allowed = visibleFor
    .split(/[,;|]/)
    .map(normalizeText)
    .filter(Boolean)

  const grado = normalizeText(GRADE_LABEL[user.grado] ?? user.grado)
  return (
    allowed.includes(normalizeText(user.usuario)) ||
    allowed.includes(normalizeText(user.rol)) ||
    allowed.includes(grado) ||
    allowed.includes('todos') ||
    userCargos(user).map(normalizeText).some((cargo) => allowed.includes(cargo))
  )
}

/*
 * Paneles de cargo de la navegación inferior. Cada persona ve el suyo:
 * quien publica formación ve el panel de Vigilante (o "Formación" si solo apoya),
 * y Compañeros y Aprendices ven el de su grado.
 */
export type RolePanel = 'secretaria' | 'venerable' | 'primer-vigilante' | 'companero' | 'segundo-vigilante' | 'aprendiz'

export function rolePanels(p: Permisos): RolePanel[] {
  const panels: RolePanel[] = []
  const publish = p.formacion.publicar
  const view = p.formacion.ver
  if (p.secretaria) panels.push('secretaria')
  if (p.venerable) panels.push('venerable')
  if (publish.includes('Compañero')) panels.push('primer-vigilante')
  if (view.includes('Compañero') && !publish.includes('Compañero')) panels.push('companero')
  if (publish.includes('Aprendiz')) panels.push('segundo-vigilante')
  if (view.includes('Aprendiz') && !publish.includes('Aprendiz')) panels.push('aprendiz')
  return panels
}
