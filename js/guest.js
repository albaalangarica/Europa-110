// Zona pública para visitantes: calendario, planchas abiertas e inscripción.

import { apiGet, apiPost } from './api.js';
import {
  $, escapeHtml, safeLink, storage, emptyCard, errorCard, loadingCards,
  canOpenDate, cardDate, longDate, mediumDate, isPastDate
} from './utils.js';

const GUEST_CACHE_KEY = 'europa110_guest';

let guest = storage.getJSON(GUEST_CACHE_KEY, null) || { tenidas: [], planchas: [] };

export async function loadGuest() {
  const hasCache = guest.tenidas.length > 0;
  if (hasCache) renderGuest();
  else $('guestCalendarList').innerHTML = loadingCards();

  try {
    const result = await apiGet('guest');
    guest = result.data || { tenidas: [], planchas: [] };
    storage.setJSON(GUEST_CACHE_KEY, guest);
    renderGuest();
  } catch (error) {
    if (!hasCache) $('guestCalendarList').innerHTML = errorCard(error.message);
  }
}

function renderGuest() {
  const allDates = guest.tenidas.map(item => item.fecha);

  $('guestCalendarList').innerHTML = guest.tenidas.length
    ? guest.tenidas.map(item => {
      const d = cardDate(item.fecha);
      const canOpen = canOpenDate(item.fecha, allDates);
      const title = escapeHtml(item.titulo);
      const attrs = canOpen
        ? `role="button" tabindex="0" data-guest-open="${escapeHtml(item.id)}" aria-label="Abrir ${title}"`
        : `aria-label="${title}"`;

      return `
        <article class="guest-card${canOpen ? ' calendar-openable' : ' calendar-card-disabled'}" ${attrs}>
          <div class="guest-card-main">
            <div class="guest-date">
              <small>${escapeHtml(d.wd)}</small>
              <strong>${escapeHtml(d.day)}</strong>
              <span>${escapeHtml(d.mon)}</span>
            </div>
            <div class="guest-card-copy">
              <h3>${title}</h3>
              <p>${[item.hora, item.lugar].filter(Boolean).map(escapeHtml).join(' · ')}</p>
              ${item.tipo ? `<div class="guest-tags"><span class="mini-tag">${escapeHtml(item.tipo)}</span></div>` : ''}
            </div>
          </div>
          ${canOpen ? `
            <svg class="calendar-card-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6"></path>
            </svg>
          ` : ''}
        </article>
      `;
    }).join('')
    : emptyCard('No hay tenidas publicadas.');

  $('guestPapersList').innerHTML = guest.planchas.length
    ? guest.planchas.map(p => {
      const link = safeLink(p.url);
      return `
        <article class="guest-card guest-plancha">
          <h3>${escapeHtml(p.titulo)}</h3>
          <p>${escapeHtml(p.autor)}</p>
          ${link ? `<a href="${link}" target="_blank" rel="noopener noreferrer">Abrir en Drive →</a>` : ''}
        </article>
      `;
    }).join('')
    : '<article class="guest-card guest-plancha"><p>No hay planchas públicas disponibles.</p></article>';
}

function renderDetail(item) {
  const isPast = isPastDate(item.fecha);
  const convocatoria = safeLink(item.convocatoria);
  const papers = item.planchas || [];

  return `
    <div class="guest-detail-hero">
      <span class="detail-kicker">Tenida</span>
      <h2>${escapeHtml(item.titulo)}</h2>
      <p>${escapeHtml(longDate(item.fecha))}</p>
      <p>${[item.hora, item.lugar].filter(Boolean).map(escapeHtml).join(' · ')}</p>
      ${item.tipo ? `<div class="guest-tags"><span class="mini-tag">${escapeHtml(item.tipo)}</span></div>` : ''}

      ${convocatoria || !isPast ? `
        <div class="guest-detail-actions">
          ${convocatoria ? `<a class="guest-action" href="${convocatoria}" target="_blank" rel="noopener noreferrer">Ver convocatoria</a>` : ''}
          ${isPast ? '' : `<button class="guest-action primary" type="button" data-guest-signup="${escapeHtml(item.id)}">Apuntarse</button>`}
        </div>
      ` : ''}
    </div>

    ${papers.length ? `
      <section class="detail-section">
        <h3>Planchas</h3>
        <div class="detail-paper-list">
          ${papers.map(p => {
            const link = safeLink(p.url);
            return `
              <article class="detail-paper-card">
                <div class="detail-paper-copy">
                  <h4>${escapeHtml(p.titulo)}</h4>
                  <p>${escapeHtml(p.autor)}</p>
                </div>
                ${link ? `<a class="detail-paper-link" href="${link}" target="_blank" rel="noopener noreferrer">Abrir en Drive</a>` : ''}
              </article>
            `;
          }).join('')}
        </div>
      </section>
    ` : ''}
  `;
}

function showGuestPanel(view) {
  $('guestCalendarPanel').classList.toggle('hidden', view !== 'calendar');
  $('guestPapersPanel').classList.toggle('hidden', view !== 'papers');
  $('guestTenidaDetailPanel').classList.toggle('hidden', view !== 'detail');

  const tab = view === 'detail' ? 'calendar' : view;
  document.querySelectorAll('.guest-tab').forEach(button => {
    button.classList.toggle('active', button.dataset.guestView === tab);
  });

  window.scrollTo(0, 0);
}

function openDetail(id) {
  const item = guest.tenidas.find(tenida => tenida.id === id);
  if (!item) return;

  $('guestTenidaDetailContent').innerHTML = renderDetail(item);
  showGuestPanel('detail');
}


/* INSCRIPCIÓN */

function openSignup(id) {
  const item = guest.tenidas.find(tenida => tenida.id === id);
  if (!item) return;

  const form = $('guestSignupForm');
  form.reset();
  form.dataset.tenidaId = item.id;
  $('guestSignupTenida').textContent = `${item.titulo} · ${mediumDate(item.fecha)}`;
  $('guestSignupStatus').textContent = '';
  $('guestSignupModal').classList.remove('hidden');
  $('guestName').focus();
}

function closeSignup() {
  $('guestSignupModal').classList.add('hidden');
}

async function submitSignup(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const status = $('guestSignupStatus');
  const submit = form.querySelector('button[type="submit"]');
  const nombre = $('guestName').value.trim();
  const logia = $('guestLodge').value.trim();

  if (!nombre || !logia) return;

  submit.disabled = true;
  status.textContent = 'Enviando…';

  try {
    const result = await apiPost('guest_signup', { tenidaId: form.dataset.tenidaId, nombre, logia });
    status.textContent = result.signup?.alreadyRegistered
      ? 'Ya estabas inscrito en esta tenida.'
      : 'Inscripción registrada.';
    form.reset();
    setTimeout(closeSignup, 1200);
  } catch (error) {
    status.textContent = error.message || 'No se pudo registrar la inscripción.';
  } finally {
    submit.disabled = false;
  }
}


export function bindGuest() {
  const view = $('guestView');

  const open = event => {
    const signup = event.target.closest('[data-guest-signup]');
    if (signup && event.type === 'click') {
      openSignup(signup.dataset.guestSignup);
      return;
    }

    const card = event.target.closest('[data-guest-open]');
    if (!card) return;
    if (event.type === 'keydown') {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
    }
    openDetail(card.dataset.guestOpen);
  };

  view.addEventListener('click', open);
  view.addEventListener('keydown', open);

  document.querySelectorAll('.guest-tab').forEach(tab => {
    tab.addEventListener('click', () => showGuestPanel(tab.dataset.guestView));
  });

  $('guestDetailBack').addEventListener('click', () => showGuestPanel('calendar'));

  $('guestSignupForm').addEventListener('submit', submitSignup);
  $('guestSignupClose').addEventListener('click', closeSignup);
  $('guestSignupModal').addEventListener('click', event => {
    if (event.target.id === 'guestSignupModal') closeSignup();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeSignup();
  });
}

export function enterGuest() {
  showGuestPanel('calendar');
  loadGuest();
}
