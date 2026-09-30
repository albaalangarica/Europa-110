// Agenda de la logia, ficha de cada tenida y convocatorias de otras logias.

import { apiGet, apiPost } from './api.js';
import { state, permissions } from './state.js';
import { showView } from './nav.js';
import {
  $, escapeHtml, safeLink, driveViewUrl, normalize, storage, emptyCard, errorCard, loadingCards,
  parseDate, isoKey, monthKey, monthLabel, startOfToday, isPastDate, attendanceIsOpen,
  canOpenDate, cardDate, longDate, dayMonth, parseAmount, formatMoney
} from './utils.js';

export const AGENDA_CACHE_KEY = 'europa110_agenda_html';
const EXTERNAL_SIGNUPS_KEY = 'europa110_external_signups';
const TENIDA_CACHE_MS = 5 * 60 * 1000;


/* DATOS */

export function tenidaId(item) {
  return String(item?.ID || isoKey(item?.Fecha) || '').trim();
}

function findTenida(id) {
  return state.agenda.find(item => tenidaId(item) === id) || null;
}

function displayTitle(item) {
  const title = String(item?.['Título'] || '').trim();
  if (title) return title;

  const type = normalize(item?.Tipo);
  if (type.includes('solst')) return 'Tenida Solsticial';
  if (type.includes('instal')) return 'Tenida de Instalación';
  return 'Tenida Ordinaria';
}

export async function loadAgenda() {
  const list = $('agendaList');

  if (!list.innerHTML.trim()) {
    list.innerHTML = storage.get(AGENDA_CACHE_KEY) || loadingCards();
  }

  try {
    const result = await apiGet('agenda');
    state.agenda = result.items || [];
    state.externos = result.externos || [];
    renderAgenda();
  } catch (error) {
    list.innerHTML = errorCard(error.message);
  }
}

async function loadTenidaData(item, force = false) {
  const id = tenidaId(item);
  if (!id) return;

  const fresh = Date.now() - (state.tenidaFetchedAt[id] || 0) < TENIDA_CACHE_MS;
  if (!force && state.tenidaData[id] && fresh) return;

  const result = await apiGet('tenida', { tenidaId: id });
  const data = result.data || {};

  state.tenidaData[id] = data;
  state.tenidaFetchedAt[id] = Date.now();
  if (data.tenida) Object.assign(item, data.tenida);

  if (state.openTenidaId === id) {
    $('tenidaDetailContent').innerHTML = renderTenidaDetail(item);
  }
}


/* LISTA */

export function renderAgenda() {
  const list = $('agendaList');
  const currentMonth = monthKey(startOfToday());

  const entries = state.agenda
    .filter(item => parseDate(item.Fecha))
    .sort((a, b) => parseDate(a.Fecha) - parseDate(b.Fecha));

  const upcoming = entries.filter(item => monthKey(item.Fecha) >= currentMonth);
  const older = entries.filter(item => monthKey(item.Fecha) < currentMonth).reverse();
  const allDates = entries.map(item => item.Fecha);

  // Se muestran los meses con tenidas o con convocatorias de otras logias.
  const months = new Set(upcoming.map(item => monthKey(item.Fecha)));
  state.externos.forEach(event => {
    const key = monthKey(event.fecha);
    if (key && key >= currentMonth) months.add(key);
  });

  let html = [...months].sort().map(key => `
    <section class="agenda-month-section">
      <h3 class="agenda-month-title">${escapeHtml(monthLabel(key))}</h3>
      ${upcoming
        .filter(item => monthKey(item.Fecha) === key)
        .map(item => renderAgendaCard(item, allDates, isPastDate(item.Fecha)))
        .join('')}
      ${renderMonthEvents(key)}
    </section>
  `).join('');

  if (!upcoming.length) {
    html += emptyCard('No hay tenidas programadas.');
  }

  if (older.length) {
    html += `
      <section class="agenda-history">
        <h3 class="agenda-history-title">Tenidas anteriores</h3>
        ${older.map(item => renderAgendaCard(item, allDates, true)).join('')}
      </section>
    `;
  }

  list.innerHTML = html;
  storage.set(AGENDA_CACHE_KEY, html);
}

function renderAgendaCard(item, allDates, isPast) {
  const d = cardDate(item.Fecha);
  const title = escapeHtml(displayTitle(item));
  const canOpen = canOpenDate(item.Fecha, allDates);
  const meta = [item.Hora, item.Lugar].filter(Boolean).map(escapeHtml).join(' · ');
  const type = escapeHtml(item.Tipo || '');

  const answer = String(item['Mi asistencia'] || '').trim();
  const showAttendance = isPast || attendanceIsOpen(item.Fecha);
  const attendance = answer === 'Sí'
    ? { css: 'yes', text: 'Asistencia confirmada' }
    : answer === 'No'
      ? { css: 'no', text: 'No asistiré' }
      : { css: 'pending', text: 'No confirmado' };

  const classes = [
    'guest-card',
    'member-agenda-card',
    isPast ? 'tenida-past' : '',
    canOpen ? '' : 'calendar-card-disabled'
  ].filter(Boolean).join(' ');

  const attrs = canOpen
    ? `role="button" tabindex="0" data-action="open-tenida" data-id="${escapeHtml(tenidaId(item))}" aria-label="Abrir ${title}"`
    : `aria-label="${title}"`;

  return `
    <article class="${classes}" ${attrs}>
      <div class="guest-card-main">
        <div class="guest-date">
          <small>${escapeHtml(d.wd)}</small>
          <strong>${escapeHtml(d.day)}</strong>
          <span>${escapeHtml(d.mon)}</span>
        </div>

        <div class="guest-card-copy">
          <h3>${title}</h3>
          ${meta ? `<p>${meta}</p>` : ''}
          ${type ? `<div class="guest-tags"><span class="mini-tag">${type}</span></div>` : ''}
          ${showAttendance ? `
            <span class="attendance-agenda-status ${attendance.css}">${attendance.text}</span>
          ` : ''}
        </div>
      </div>

      ${canOpen ? chevron() : ''}
    </article>
  `;
}

function renderMonthEvents(key) {
  const events = state.externos
    .filter(event => monthKey(event.fecha) === key)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  return `
    <details class="month-events">
      <summary>Invitaciones y actos de ${escapeHtml(monthLabel(key))}${events.length ? ` · ${events.length}` : ''}</summary>
      <div class="month-events-list">
        ${events.length
          ? events.map(event => `
            <article class="external-event-card" role="button" tabindex="0"
              data-action="open-external" data-id="${escapeHtml(event.id)}"
              aria-label="Abrir ${escapeHtml(event.titulo)}">
              <div class="external-event-date">${escapeHtml(dayMonth(event.fecha))}</div>
              <h3 class="external-event-title">${escapeHtml(event.titulo || 'Convocatoria')}</h3>
              <span class="external-event-marker">Otra logia</span>
            </article>
          `).join('')
          : '<div class="empty-inline">No hay invitaciones ni actos registrados este mes.</div>'}
      </div>
    </details>
  `;
}


/* FICHA DE TENIDA */

export function openTenida(id) {
  const item = findTenida(id);
  if (!item) return;

  state.openTenidaId = id;
  $('tenidaDetailContent').innerHTML = renderTenidaDetail(item);
  showView('tenida');

  // Planchas, tronco y confirmaciones llegan en una sola petición.
  loadTenidaData(item).catch(() => {});
}

function renderTenidaDetail(item) {
  const id = tenidaId(item);
  const extra = state.tenidaData[id] || {};
  const number = item['Nº tenida'];
  const presence = item['Libro de presencia'];

  let html = `
    <div class="detail-hero">
      <span class="detail-kicker">${number ? `Tenida nº ${escapeHtml(number)}` : 'Tenida'}</span>
      <h2>${escapeHtml(displayTitle(item))}</h2>

      ${item.Tipo ? `<div class="tenida-tags" style="margin-top:10px"><span class="mini-tag">${escapeHtml(item.Tipo)}</span></div>` : ''}

      <div class="detail-meta">
        <div class="detail-meta-row">
          ${iconClock()}
          <span>
            ${escapeHtml(longDate(item.Fecha))}${item.Hora ? ` · ${escapeHtml(item.Hora)}` : ''}
            ${presence ? `<br>Libro de presencia: ${escapeHtml(presence)}` : ''}
          </span>
        </div>
        ${item.Lugar ? `<div class="detail-meta-row">${iconMap()}<span>${escapeHtml(item.Lugar)}</span></div>` : ''}
      </div>
    </div>
  `;

  if (attendanceIsOpen(item.Fecha)) {
    const answer = String(item['Mi asistencia'] || '').trim();
    html += `
      <section class="detail-section">
        <h3>Asistencia</h3>
        <div class="attendance-box">
          <p class="attendance-copy">Confirma si asistirás a esta tenida. Puedes cambiar tu respuesta después.</p>
          <div class="attendance-actions">
            <button class="attendance-button${answer === 'Sí' ? ' primary' : ''}" type="button"
              data-action="attendance" data-id="${escapeHtml(id)}" data-answer="Sí">Confirmo asistencia</button>
            <button class="attendance-button${answer === 'No' ? ' attendance-no-selected' : ''}" type="button"
              data-action="attendance" data-id="${escapeHtml(id)}" data-answer="No">No asistiré</button>
          </div>
          <p id="attendanceStatus" class="attendance-status" aria-live="polite"></p>
        </div>
      </section>
    `;
  }

  if (permissions().gestion) {
    html += renderAttendanceSummary(extra.attendanceSummary || findManagementAttendance(id));
  }

  html += `
    <section class="detail-section">
      <h3>Asuntos de familia</h3>
      <div class="family-matter-row">
        <strong>Tronco de la Viuda</strong>
        ${renderTronco(id, extra.tronco)}
      </div>
    </section>
  `;

  const order = String(item['Orden del día'] || '')
    .split(/\r?\n/)
    .map(line => line.replace(/^\s*[-•*]\s*/, '').trim())
    .filter(Boolean);

  if (order.length) {
    html += `
      <section class="detail-section">
        <h3>Orden del día</h3>
        <ul>${order.map(point => `<li>${escapeHtml(point)}</li>`).join('')}</ul>
      </section>
    `;
  } else if (item['Descripción']) {
    html += `
      <section class="detail-section">
        <h3>Información</h3>
        <p style="margin:0;color:var(--text-2);font-size:12.5px;line-height:1.45">${escapeHtml(item['Descripción'])}</p>
      </section>
    `;
  }

  const papers = (extra.planchas || []).map(p => ({
    title: p['Título'] || 'Plancha',
    author: p.Autor || '',
    url: safeLink(driveViewUrl(p['Enlace / archivo']))
  }));

  if (papers.length) {
    html += `
      <section class="detail-section">
        <h3>Planchas</h3>
        ${papers.map(paper => paper.url ? `
          <a class="paper-detail-card paper-detail-link" href="${paper.url}" target="_blank" rel="noopener noreferrer">
            <strong>${escapeHtml(paper.title)}</strong>
            <span>${escapeHtml(paper.author)}</span>
            <span class="paper-open-action">Abrir en Drive <span aria-hidden="true">→</span></span>
          </a>
        ` : `
          <div class="paper-detail-card">
            <strong>${escapeHtml(paper.title)}</strong>
            <span>${escapeHtml(paper.author)}</span>
          </div>
        `).join('')}
      </section>
    `;
  }

  const convocatoria = safeLink(item.Convocatoria);
  if (convocatoria) {
    html += `
      <section class="detail-section">
        <h3>Documentación</h3>
        <a class="paper-detail-card paper-detail-link" href="${convocatoria}" target="_blank" rel="noopener noreferrer">
          <strong>Convocatoria</strong>
          <span class="paper-open-action">Abrir <span aria-hidden="true">→</span></span>
        </a>
      </section>
    `;
  }

  return html;
}

function findManagementAttendance(id) {
  return (state.management?.attendance || []).find(row => String(row.tenidaId || '') === id) || null;
}

// Pastillas sí / no / pendientes y nombres. También lo usa el panel de gestión.
export function attendanceSummaryBody(row) {
  const list = names => names.length ? names.map(escapeHtml).join(', ') : '—';
  const yes = row.si || [];
  const no = row.no || [];
  const pending = row.pendientes || [];

  return `
    <div class="attendance-summary-row">
      <span class="attendance-summary-pill yes">${yes.length} sí</span>
      <span class="attendance-summary-pill no">${no.length} no</span>
      <span class="attendance-summary-pill pending">${pending.length} sin confirmar</span>
    </div>
    <div class="management-names">
      <div><strong>Asisten</strong><span>${list(yes)}</span></div>
      <div><strong>No asisten</strong><span>${list(no)}</span></div>
      <div><strong>Pendientes</strong><span>${list(pending)}</span></div>
    </div>
  `;
}

function renderAttendanceSummary(row) {
  if (!row) return '';

  return `
    <section class="detail-section">
      <h3>Confirmaciones de la tenida</h3>
      <div class="management-detail-box">${attendanceSummaryBody(row)}</div>
    </section>
  `;
}

function renderTronco(id, row) {
  const amount = row ? parseAmount(row.Importe) : NaN;

  let html = '<div class="management-detail-box tronco-family-box">';

  html += Number.isFinite(amount)
    ? `<div class="tronco-tenida-value">${escapeHtml(formatMoney(amount))}</div>
       ${row.Observaciones ? `<p class="attendance-copy">${escapeHtml(row.Observaciones)}</p>` : ''}`
    : '<p class="attendance-copy">Importe pendiente de registrar.</p>';

  if (permissions().tronco) {
    html += `
      <div class="tronco-entry-box">
        <label for="troncoAmountInput">Importe del Tronco de la Viuda</label>
        <div class="tronco-entry-row">
          <input id="troncoAmountInput" class="tronco-input" type="number" inputmode="decimal"
            min="0" step="0.01" placeholder="0,00" value="${Number.isFinite(amount) ? amount : ''}">
          <span>€</span>
        </div>
        <button class="attendance-button primary" type="button" data-action="save-tronco" data-id="${escapeHtml(id)}">
          Guardar importe
        </button>
        <p id="troncoSaveStatus" class="attendance-status" aria-live="polite"></p>
      </div>
    `;
  }

  return html + '</div>';
}

async function saveAttendance(id, answer) {
  const buttons = document.querySelectorAll('.attendance-actions .attendance-button');
  const status = () => $('attendanceStatus');

  buttons.forEach(button => { button.disabled = true; });
  if (status()) status().textContent = 'Guardando…';

  try {
    await apiPost('attendance', { tenidaId: id, respuesta: answer });

    const item = findTenida(id);
    if (item) {
      item['Mi asistencia'] = answer;
      renderAgenda();
      // Volvemos a pedir la tenida para actualizar el resumen de confirmaciones.
      await loadTenidaData(item, true).catch(() => {
        $('tenidaDetailContent').innerHTML = renderTenidaDetail(item);
      });
    }

    if (status()) status().textContent = answer === 'Sí' ? 'Asistencia confirmada.' : 'Ausencia registrada.';
  } catch (error) {
    if (status()) status().textContent = error.message || 'No se pudo guardar la respuesta.';
  } finally {
    document.querySelectorAll('.attendance-actions .attendance-button')
      .forEach(button => { button.disabled = false; });
  }
}

async function saveTronco(id) {
  const input = $('troncoAmountInput');
  const status = () => $('troncoSaveStatus');
  const importe = String(input?.value || '').trim().replace(',', '.');

  if (!importe || !Number.isFinite(Number(importe)) || Number(importe) < 0) {
    status().textContent = 'Introduce un importe válido.';
    return;
  }

  status().textContent = 'Guardando…';

  try {
    const result = await apiPost('tronco', { tenidaId: id, importe });

    state.tenidaData[id] = { ...(state.tenidaData[id] || {}), tronco: result.tronco };
    state.management = null; // el panel de gestión se recargará con el nuevo importe

    const item = findTenida(id);
    if (item) $('tenidaDetailContent').innerHTML = renderTenidaDetail(item);
    if (status()) status().textContent = 'Guardado.';
  } catch (error) {
    if (status()) status().textContent = error.message || 'No se pudo guardar el importe.';
  }
}


/* CONVOCATORIAS DE OTRAS LOGIAS */

function openExternal(id) {
  const event = state.externos.find(item => item.id === id);
  if (!event) return;

  state.openTenidaId = '';
  $('tenidaDetailContent').innerHTML = renderExternalDetail(event);
  showView('tenida');
}

function externalSignups() {
  const list = storage.getJSON(EXTERNAL_SIGNUPS_KEY, []);
  return Array.isArray(list) ? list : [];
}

function renderExternalDetail(event) {
  const signedUp = externalSignups().includes(event.id);
  const row = (label, value, block) => value
    ? `<div class="external-detail-row"><strong>${label}</strong>${block ? `<p>${escapeHtml(value)}</p>` : `<span>${escapeHtml(value)}</span>`}</div>`
    : '';

  return `
    <div class="external-detail">
      <div class="detail-hero">
        <span class="detail-kicker">Otra convocatoria</span>
        <h2>${escapeHtml(event.titulo || 'Convocatoria')}</h2>
        ${event.grado ? `<div class="tenida-tags" style="margin-top:10px"><span class="mini-tag">${escapeHtml(event.grado)}</span></div>` : ''}
        <div class="detail-meta">
          <div class="detail-meta-row">
            ${iconClock()}
            <span>
              ${escapeHtml(longDate(event.fecha))}${event.hora ? ` · ${escapeHtml(event.hora)}` : ''}
              ${event.presencia ? `<br>Apertura / presencia: ${escapeHtml(event.presencia)}` : ''}
            </span>
          </div>
          ${event.lugar ? `<div class="detail-meta-row">${iconMap()}<span>${escapeHtml(event.lugar)}</span></div>` : ''}
        </div>
      </div>
      <div class="external-detail-body">
        ${row('Logia', event.logia)}
        ${row('Tipo', event.tipo)}
        ${row('Información', event.informacion, true)}
        ${row('Observaciones', event.observaciones, true)}
        <button class="external-signup-button" type="button" data-action="external-signup"
          data-id="${escapeHtml(event.id)}" ${signedUp ? 'disabled' : ''}>${signedUp ? 'Apuntado' : 'Apuntarme'}</button>
        <p id="externalSignupStatus" class="external-signup-status">${signedUp ? 'Anotado en este dispositivo.' : ''}</p>
      </div>
    </div>
  `;
}

// Solo queda anotado en este dispositivo: la logia organizadora no recibe aviso.
function signupExternal(button) {
  const list = externalSignups();
  if (!list.includes(button.dataset.id)) {
    list.push(button.dataset.id);
    storage.setJSON(EXTERNAL_SIGNUPS_KEY, list);
  }

  button.textContent = 'Apuntado';
  button.disabled = true;
  $('externalSignupStatus').textContent =
    'Anotado en este dispositivo. Recuerda confirmar tu asistencia a la logia organizadora.';
}


/* EVENTOS */

export function bindAgenda() {
  const actions = {
    'open-tenida': el => openTenida(el.dataset.id),
    'open-external': el => openExternal(el.dataset.id),
    'attendance': el => saveAttendance(el.dataset.id, el.dataset.answer),
    'save-tronco': el => saveTronco(el.dataset.id),
    'external-signup': el => signupExternal(el)
  };

  const run = event => {
    const el = event.target.closest('[data-action]');
    const action = el && actions[el.dataset.action];
    if (!action || !$('privateView').contains(el)) return;

    if (event.type === 'keydown') {
      // Las tarjetas se abren también con el teclado.
      if (el.tagName === 'BUTTON' || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
    }

    action(el);
  };

  document.addEventListener('click', run);
  document.addEventListener('keydown', run);

  $('tenidaBackButton').addEventListener('click', () => {
    state.openTenidaId = '';
    showView('agenda');
  });
}


/* ICONOS */

function chevron() {
  return `
    <svg class="calendar-card-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6"></path>
    </svg>
  `;
}

function iconClock() {
  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9"></circle>
      <path d="M12 7v5l3 2"></path>
    </svg>
  `;
}

function iconMap() {
  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"></path>
      <circle cx="12" cy="10" r="2.5"></circle>
    </svg>
  `;
}
