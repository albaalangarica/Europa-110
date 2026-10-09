// Texto sin tildes, en minúsculas y con espacios simples, para comparar nombres, cargos y grados.
export function normalizeText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
}

export function capitalize(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : ''
}

// El enlace si es http(s); si no, cadena vacía.
export function safeLink(value: unknown): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : ''
  } catch {
    return ''
  }
}

// Los enlaces de Drive en modo /preview se abren mejor como /view.
export function driveViewUrl(value: unknown): string {
  return String(value ?? '').replace(/\/preview(?:\?.*)?$/, '/view')
}

// Entiende 12.5, 12,50, 1.234,56 y "12,50 €".
export function parseAmount(value: unknown): number {
  if (typeof value === 'number') return value
  let raw = String(value ?? '').trim().replace(/[€\s]/g, '')
  if (raw.includes(',')) raw = raw.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) raw = raw.replace(/\./g, '')
  return raw === '' ? NaN : Number(raw)
}

export function formatMoney(value: unknown): string {
  const number = parseAmount(value)
  if (!Number.isFinite(number)) return String(value || '—')
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(number)
}

// Separa un texto en líneas no vacías, quitando viñetas al principio.
export function lines(value: unknown): string[] {
  return String(value ?? '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-•*]\s*/, '').trim())
    .filter(Boolean)
}
