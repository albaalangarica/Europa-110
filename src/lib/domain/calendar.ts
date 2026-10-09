/*
 * "Añadir a mi calendario": archivo .ics (iPhone, Android, Outlook) y enlace de Google Calendar.
 * Con hora, el acto dura 2 horas en hora de España; sin hora, ocupa el día entero.
 */

export interface CalendarEvent {
  uid: string
  title: string
  date: string // 2026-10-22
  time?: string // "19:30", "19.30h", "19h"…
  location?: string
  description?: string
  url?: string
}

function parseTime(value?: string): { h: number; m: number } | null {
  const match = /(\d{1,2})(?:[:.h](\d{2}))?/.exec(String(value ?? ''))
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2] ?? 0)
  return h < 24 && m < 60 ? { h, m } : null
}

const pad = (n: number) => String(n).padStart(2, '0')
const compact = (iso: string) => iso.replace(/-/g, '')

function nextDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

// Inicio y fin en hora local ("20261022T193000"), o días para un acto de día entero.
function range(event: CalendarEvent): { allDay: boolean; start: string; end: string } {
  const t = parseTime(event.time)
  if (!t) return { allDay: true, start: compact(event.date), end: compact(nextDay(event.date)) }
  const endH = t.h + 2
  const endDate = endH >= 24 ? nextDay(event.date) : event.date
  return {
    allDay: false,
    start: `${compact(event.date)}T${pad(t.h)}${pad(t.m)}00`,
    end: `${compact(endDate)}T${pad(endH % 24)}${pad(t.m)}00`,
  }
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1')
}

// Las líneas de un .ics no deben pasar de 75 octetos.
function fold(line: string): string {
  const out: string[] = []
  let rest = line
  while (Buffer.byteLength(rest, 'utf8') > 74) {
    let cut = 74
    while (Buffer.byteLength(rest.slice(0, cut), 'utf8') > 74) cut--
    out.push(rest.slice(0, cut))
    rest = ` ${rest.slice(cut)}`
  }
  out.push(rest)
  return out.join('\r\n')
}

export function buildIcs(event: CalendarEvent, now: Date = new Date()): string {
  const { allDay, start, end } = range(event)
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Europa 110//App//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}@europa110`,
    `DTSTAMP:${stamp}`,
    allDay ? `DTSTART;VALUE=DATE:${start}` : `DTSTART;TZID=Europe/Madrid:${start}`,
    allDay ? `DTEND;VALUE=DATE:${end}` : `DTEND;TZID=Europe/Madrid:${end}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    event.location ? `LOCATION:${escapeIcs(event.location)}` : '',
    event.description ? `DESCRIPTION:${escapeIcs(event.description)}` : '',
    event.url ? `URL:${event.url}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)
  return lines.map(fold).join('\r\n') + '\r\n'
}

export function googleCalendarUrl(event: CalendarEvent): string {
  const { start, end } = range(event)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${start}/${end}`,
    ctz: 'Europe/Madrid',
  })
  if (event.location) params.set('location', event.location)
  if (event.description) params.set('details', event.description.slice(0, 1500))
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
