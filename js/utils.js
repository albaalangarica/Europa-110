// Utilidades compartidas: HTML seguro, fechas, importes y almacenamiento local.

export const $ = id => document.getElementById(id);


/* HTML */

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Devuelve el enlace escapado si es http(s); si no, cadena vacía.
export function safeLink(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    return escapeHtml(url.toString());
  } catch {
    return '';
  }
}

// Los enlaces de Drive en modo /preview se abren mejor como /view.
export function driveViewUrl(value) {
  return String(value || '').replace(/\/preview(?:\?.*)?$/, '/view');
}

export function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

export function capitalize(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

export function loadingCards() {
  return `
    <article class="content-card loading-card" aria-label="Cargando"></article>
    <article class="content-card loading-card" aria-hidden="true"></article>
    <article class="content-card loading-card" aria-hidden="true"></article>
  `;
}

export function emptyCard(message) {
  return `<article class="content-card"><p>${escapeHtml(message)}</p></article>`;
}

export function errorCard(message) {
  return `
    <article class="content-card">
      <p class="error">${escapeHtml(message || 'Se ha producido un error.')}</p>
    </article>
  `;
}


/* FECHAS */

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

// Acepta 2026-10-10, 10/10/2026, 10-10-2026 y 10.10.2026.
export function parseDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const raw = String(value || '').trim();
  if (!raw) return null;

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const dmy = raw.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));

  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isoKey(value) {
  const d = parseDate(value);
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function monthKey(value) {
  return isoKey(value).slice(0, 7);
}

export function monthLabel(key) {
  const d = parseDate(`${key}-01`);
  return d ? capitalize(new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(d)) : '';
}

export function isPastDate(value) {
  const d = parseDate(value);
  return !!d && d < startOfToday();
}

export function daysUntil(value) {
  const d = parseDate(value);
  if (!d) return NaN;
  return Math.round((d - startOfToday()) / 86400000);
}

// La confirmación de asistencia se abre 10 días antes.
export function attendanceIsOpen(value) {
  const days = daysUntil(value);
  return days >= 0 && days <= 10;
}

/*
  Una tenida se puede abrir si ya ha pasado, si es la siguiente
  (aunque falte más de un mes) o si falta menos de un mes natural.
*/
export function canOpenDate(value, allDates) {
  const date = parseDate(value);
  if (!date) return false;

  const today = startOfToday();
  if (date < today) return true;

  const next = allDates
    .map(parseDate)
    .filter(d => d && d >= today)
    .sort((a, b) => a - b)[0];
  if (next && next.getTime() === date.getTime()) return true;

  const oneMonth = new Date(today);
  oneMonth.setMonth(oneMonth.getMonth() + 1);
  return date < oneMonth;
}

export function cardDate(value) {
  const d = parseDate(value);
  if (!d) return { wd: '', day: String(value || ''), mon: '' };
  return { wd: WEEKDAYS[d.getDay()], day: String(d.getDate()), mon: MONTHS[d.getMonth()] };
}

export function longDate(value) {
  const d = parseDate(value);
  if (!d) return String(value || '');
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(d);
}

export function mediumDate(value) {
  const d = parseDate(value);
  if (!d) return String(value || '');
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

export function shortDate(value) {
  const d = parseDate(value);
  if (!d) return String(value || '');
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

export function dayMonth(value) {
  const d = parseDate(value);
  if (!d) return String(value || '');
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' }).format(d).replace('.', '');
}

export function todayText() {
  return capitalize(new Intl.DateTimeFormat('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long'
  }).format(new Date()));
}


/* IMPORTES */

// Entiende 12.5, 12,50, 1.234,56 y "12,50 €".
export function parseAmount(value) {
  if (typeof value === 'number') return value;
  let raw = String(value ?? '').trim().replace(/[€\s]/g, '');
  if (raw.includes(',')) {
    raw = raw.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
    raw = raw.replace(/\./g, '');
  }
  return raw === '' ? NaN : Number(raw);
}

export function formatMoney(value) {
  const number = parseAmount(value);
  if (!Number.isFinite(number)) return String(value || '—');
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(number);
}


/* ALMACENAMIENTO LOCAL (puede no estar disponible en modo privado) */

export const storage = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* sin almacenamiento */ }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* sin almacenamiento */ }
  },
  getJSON(key, fallback) {
    try { return JSON.parse(this.get(key)) ?? fallback; } catch { return fallback; }
  },
  setJSON(key, value) {
    this.set(key, JSON.stringify(value));
  }
};
