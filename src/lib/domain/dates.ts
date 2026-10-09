import { capitalize } from './text'

/*
 * Las fechas de tenidas, formaciones y convocatorias son días sin hora ("2026-10-10").
 * "Hoy" se calcula siempre en hora de España, también en el servidor (que está en UTC).
 */

export const TIME_ZONE = 'Europe/Madrid'

const ISO = /^(\d{4})-(\d{2})-(\d{2})/

export function todayIso(now: Date = new Date()): string {
  // en-CA da el formato 2026-10-10.
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

function toUtc(iso: string): Date | null {
  const m = ISO.exec(iso || '')
  if (!m) return null
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
}

// Acepta 2026-10-10, 10/10/2026, 10-10-2026 y 10.10.2026. Devuelve '' si no se entiende.
export function toIsoDate(value: unknown): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const iso = ISO.exec(raw)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(raw)
  if (dmy) return `${dmy[3]}-${dmy[2]!.padStart(2, '0')}-${dmy[1]!.padStart(2, '0')}`
  return ''
}

export function daysUntil(iso: string, today: string = todayIso()): number {
  const a = toUtc(iso)
  const b = toUtc(today)
  if (!a || !b) return NaN
  return Math.round((a.getTime() - b.getTime()) / 86400000)
}

export function isPast(iso: string, today: string = todayIso()): boolean {
  return Boolean(iso) && iso < today
}

// La confirmación de asistencia se abre 10 días antes.
export function attendanceIsOpen(iso: string, today: string = todayIso()): boolean {
  const days = daysUntil(iso, today)
  return days >= 0 && days <= 10
}

/*
 * Una tenida se puede abrir si ya ha pasado, si es la siguiente
 * (aunque falte más de un mes) o si falta menos de un mes natural.
 */
export function canOpenDate(iso: string, allDates: string[], today: string = todayIso()): boolean {
  if (!toUtc(iso)) return false
  if (iso < today) return true
  const next = allDates.filter((d) => toUtc(d) && d >= today).sort()[0]
  if (next === iso) return true
  const t = toUtc(today)!
  const oneMonth = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()))
  return toUtc(iso)! < oneMonth
}

export function monthKey(iso: string): string {
  return ISO.test(iso || '') ? iso.slice(0, 7) : ''
}

function fmt(iso: string, options: Intl.DateTimeFormatOptions): string {
  const d = toUtc(iso)
  if (!d) return iso || ''
  return new Intl.DateTimeFormat('es-ES', { ...options, timeZone: 'UTC' }).format(d)
}

export function monthLabel(key: string): string {
  return capitalize(fmt(`${key}-01`, { month: 'long' }))
}

export function monthYearLabel(key: string): string {
  return capitalize(fmt(`${key}-01`, { month: 'long', year: 'numeric' }))
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

export function cardDate(iso: string): { wd: string; day: string; mon: string } {
  const d = toUtc(iso)
  if (!d) return { wd: '', day: iso || '', mon: '' }
  return { wd: WEEKDAYS[d.getUTCDay()]!, day: String(d.getUTCDate()), mon: MONTHS[d.getUTCMonth()]! }
}

export const longDate = (iso: string) => fmt(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
export const mediumDate = (iso: string) => fmt(iso, { day: 'numeric', month: 'long', year: 'numeric' })
export const shortDate = (iso: string) => fmt(iso, { day: 'numeric', month: 'short', year: 'numeric' })
export const dayMonth = (iso: string) => fmt(iso, { day: '2-digit', month: 'short' }).replace('.', '')

export function todayText(now: Date = new Date()): string {
  return capitalize(new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TIME_ZONE }).format(now))
}

export function dateTimeText(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE }).format(d)
}
