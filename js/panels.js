// Paneles según cargo: Secretaría, Venerable Maestro y formación de Compañeros y Aprendices.

import { apiGet, apiPost } from './api.js';
import { state, permissions } from './state.js';
import { attendanceSummaryBody } from './agenda.js';
import {
  $, escapeHtml, safeLink, driveViewUrl, normalize, emptyCard, errorCard, loadingCards,
  parseDate, startOfToday, shortDate, formatMoney
} from './utils.js';


/* QUÉ PANELES VE CADA PERSONA */

const hasLevel = (levels, level) => (levels || []).some(item => normalize(item) === normalize(level));

export function configureRoleNav() {
  const p = permissions();
  const publish = p.formacion?.publicar || [];
  const view = p.formacion?.ver || [];

  const visible = {
    secretary: !!p.secretaria,
    master: !!p.venerable,
    warden: hasLevel(publish, 'Compañero'),
    'second-warden': hasLevel(publish, 'Aprendiz'),
    companion: hasLevel(view, 'Compañero') && !hasLevel(publish, 'Compañero'),
    apprentice: hasLevel(view, 'Aprendiz') && !hasLevel(publish, 'Aprendiz')
  };

  document.querySelectorAll('.bottom-nav .role-nav-item').forEach(button => {
    button.hidden = !visible[button.dataset.view];
  });

  // Quien ayuda en la formación sin ser Vigilante ve el mismo panel con otro nombre.
  setPanelLabels('warden', p.primerVigilante
    ? { nav: '1er Vigilante', title: 'Panel del Primer Vigilante' }
    : { nav: 'Formación', title: 'Formación de Compañeros' });
  setPanelLabels('second-warden', p.segundoVigilante
    ? { nav: '2º Vigilante', title: 'Panel del Segundo Vigilante' }
    : { nav: 'Formación', title: 'Formación de Aprendices' });

  const count = document.querySelectorAll('.bottom-nav [data-view]:not([hidden])').length;
  $('bottomNav').style.gridTemplateColumns = `repeat(${count}, 1fr)`;
}

function setPanelLabels(view, labels) {
  const nav = document.querySelector(`.role-nav-item[data-view="${view}"] span`);
  const title = document.querySelector(`.view-panel[data-view="${view}"] h2`);
  if (nav) nav.textContent = labels.nav;
  if (title) title.textContent = labels.title;
}


/* SECRETARÍA Y VENERABLE */

const MANAGEMENT_TITLES = {
  secretaryPanelContent: 'Panel de Secretaría',
  masterPanelContent: 'Panel del Venerable Maestro'
};

export async function loadManagement() {
  const hosts = Object.keys(MANAGEMENT_TITLES).map($);

  if (state.management) {
    renderManagement();
    return;
  }

  hosts.forEach(host => { host.innerHTML = loadingCards(); });

  try {
    const result = await apiGet('management');
    state.management = result.data || { unreadPapers: [], attendance: [], tronco: [] };
    renderManagement();
  } catch (error) {
    hosts.forEach(host => { host.innerHTML = errorCard(error.message); });
  }
}

function renderManagement() {
  const data = state.management;
  const papers = data.unreadPapers || [];
  const attendance = (data.attendance || []).slice()
    .sort((a, b) => (parseDate(a.fecha) || 0) - (parseDate(b.fecha) || 0));
  const tronco = (data.tronco || []).slice()
    .sort((a, b) => (parseDate(b['Fecha tenida']) || 0) - (parseDate(a['Fecha tenida']) || 0));

  const body = `
    <section class="management-section">
      <h3>Planchas sin leer</h3>
      <div class="management-list">
        ${papers.length ? papers.map(p => {
          const link = safeLink(driveViewUrl(p['Enlace / archivo']));
          return `
            <article class="management-item">
              <h4>${escapeHtml(p['Título'] || 'Plancha')}</h4>
              <p>${escapeHtml(p.Autor || '')}${p.Tema ? ` · ${escapeHtml(p.Tema)}` : ''}</p>
              ${link ? `<a class="management-paper-link" href="${link}" target="_blank" rel="noopener noreferrer">Abrir en Drive →</a>` : ''}
              <p style="margin-top:8px">Pendiente de incluir en un próximo orden del día.</p>
            </article>
          `;
        }).join('') : '<div class="empty-card">No hay planchas pendientes de lectura.</div>'}
      </div>
    </section>

    <section class="management-section">
      <h3>Confirmaciones a las tenidas</h3>
      <div class="management-list">
        ${attendance.length ? attendance.map(row => `
          <article class="management-item">
            <h4>${escapeHtml(row.titulo || 'Tenida')}</h4>
            <p>${escapeHtml(shortDate(row.fecha))}</p>
            ${attendanceSummaryBody(row)}
          </article>
        `).join('') : '<div class="empty-card">No hay tenidas disponibles.</div>'}
      </div>
    </section>

    <section class="management-section">
      <h3>
        <svg class="section-symbol" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M8 6h8"></path>
          <path d="M9 6 8 3h8l-1 3"></path>
          <path d="M7 8c-2 2.2-3 5-3 8 0 3.2 2.4 5 8 5s8-1.8 8-5c0-3-1-5.8-3-8"></path>
          <path d="M12 17.2s-3-1.7-3-3.8c0-1 .7-1.8 1.7-1.8.6 0 1.1.3 1.3.8.2-.5.7-.8 1.3-.8 1 0 1.7.8 1.7 1.8 0 2.1-3 3.8-3 3.8Z"></path>
        </svg>
        <span>Tronco de la Viuda</span>
      </h3>
      <div class="management-list">
        ${tronco.length ? tronco.map(row => `
          <article class="management-item">
            <h4>${escapeHtml(row.Tenida || 'Tenida')}</h4>
            <p>${escapeHtml(shortDate(row['Fecha tenida']))}</p>
            <div class="tronco-amount">${escapeHtml(formatMoney(row.Importe))}</div>
          </article>
        `).join('') : '<div class="empty-card">Todavía no hay importes registrados.</div>'}
      </div>
    </section>
  `;

  Object.entries(MANAGEMENT_TITLES).forEach(([id, title]) => {
    $(id).innerHTML = `
      <div class="role-panel-header">
        <h2>${escapeHtml(title)}</h2>
        <p>Seguimiento de asistencias, planchas pendientes, Tronco de la Viuda e información de Secretaría.</p>
      </div>
      ${body}
    `;
  });
}


/* FORMACIÓN */

export async function loadFormations() {
  try {
    const result = await apiGet('formation');
    state.formations = result.data || [];
    renderFormations();
  } catch (error) {
    document.querySelectorAll('[data-formation-list]').forEach(host => {
      host.innerHTML = errorCard(error.message);
    });
  }
}

function renderFormations() {
  const today = startOfToday();

  document.querySelectorAll('[data-formation-list]').forEach(host => {
    const [level, mode] = host.dataset.formationList.split(':');

    let items = (state.formations || [])
      .filter(item => normalize(item.Nivel) === normalize(level))
      .sort((a, b) => (parseDate(a.Fecha) || 0) - (parseDate(b.Fecha) || 0));

    // Las formaciones sin fecha se consideran próximas.
    if (mode === 'future') items = items.filter(item => !parseDate(item.Fecha) || parseDate(item.Fecha) >= today);
    if (mode === 'past') items = items.filter(item => parseDate(item.Fecha) && parseDate(item.Fecha) < today).reverse();

    host.innerHTML = items.length
      ? items.map(renderFormation).join('')
      : `<div class="empty-card">${escapeHtml(host.dataset.empty || 'No hay formaciones.')}</div>`;
  });
}

function renderFormation(item) {
  const raw = item.Enlaces || [];
  const links = (Array.isArray(raw) ? raw : String(raw).split('\n'))
    .map(safeLink)
    .filter(Boolean);

  return `
    <article class="management-item">
      <h4>${escapeHtml(item['Título'] || 'Formación')}</h4>
      <p>${item.Fecha ? escapeHtml(shortDate(item.Fecha)) : 'Sin fecha'}</p>
      ${item.Nota ? `<p>${escapeHtml(item.Nota)}</p>` : ''}
      ${links.length ? `
        <div class="formation-links">
          ${links.map((url, i) => `<a href="${url}" target="_blank" rel="noopener noreferrer">Abrir enlace ${i + 1} →</a>`).join('')}
        </div>
      ` : ''}
    </article>
  `;
}

const LINK_FIELD = '<label>Enlace<input name="enlace" type="url" placeholder="https://"></label>';

function toggleFormationForm(button) {
  const form = button.parentElement.querySelector('[data-formation-form]');
  const opening = form.classList.contains('hidden');
  form.classList.toggle('hidden', !opening);
  button.setAttribute('aria-expanded', String(opening));
  button.textContent = opening ? 'Cerrar formulario' : '+ Publicar formación';
}

async function publishFormation(form) {
  const status = form.querySelector('[data-role="status"]');
  const submit = form.querySelector('button[type="submit"]');
  const titulo = form.elements.titulo.value.trim();

  if (!titulo) {
    status.textContent = 'El título es obligatorio.';
    return;
  }

  status.textContent = 'Publicando…';
  submit.disabled = true;

  try {
    await apiPost('formation', {
      nivel: form.dataset.formationForm,
      titulo,
      fecha: form.elements.fecha.value,
      nota: form.elements.nota.value.trim(),
      enlaces: [...form.querySelectorAll('input[name="enlace"]')].map(input => input.value.trim()).filter(Boolean)
    });

    form.reset();
    form.querySelector('.formation-link-list').innerHTML = LINK_FIELD;
    await loadFormations();
    status.textContent = 'Formación publicada.';
  } catch (error) {
    status.textContent = error.message || 'No se pudo publicar.';
  } finally {
    submit.disabled = false;
  }
}

export function resetPanels() {
  Object.keys(MANAGEMENT_TITLES).forEach(id => { $(id).innerHTML = ''; });
  document.querySelectorAll('[data-formation-list]').forEach(host => { host.innerHTML = ''; });
  document.querySelectorAll('[data-formation-form]').forEach(form => {
    form.reset();
    form.querySelector('[data-role="status"]').textContent = '';
  });
}

export function bindPanels() {
  document.addEventListener('click', event => {
    const toggle = event.target.closest('[data-action="toggle-formation-form"]');
    if (toggle) toggleFormationForm(toggle);

    const addLink = event.target.closest('[data-action="add-formation-link"]');
    if (addLink) {
      addLink.closest('form').querySelector('.formation-link-list').insertAdjacentHTML('beforeend', LINK_FIELD);
    }
  });

  document.querySelectorAll('[data-formation-form]').forEach(form => {
    form.addEventListener('submit', event => {
      event.preventDefault();
      publishFormation(form);
    });
  });
}
