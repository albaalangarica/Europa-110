// Pestañas Planchas e Interno (documentos).

import { apiGet } from './api.js';
import { state } from './state.js';
import { $, escapeHtml, safeLink, driveViewUrl, normalize, emptyCard, errorCard, loadingCards } from './utils.js';

let papers = [];

export async function loadPlanchas() {
  const list = $('planchasList');
  list.innerHTML = loadingCards();

  try {
    const result = await apiGet('planchas');
    papers = result.items || [];
    state.loaded.planchas = true;
    renderPlanchas();
  } catch (error) {
    list.innerHTML = errorCard(error.message);
  }
}

function renderPlanchas() {
  const query = normalize($('paperSearch').value);

  const items = !query ? papers : papers.filter(item =>
    ['Título', 'Autor', 'Tema', 'Resumen', 'Curso', 'Grado']
      .map(field => normalize(item[field]))
      .join(' ')
      .includes(query)
  );

  $('planchasList').innerHTML = items.length
    ? items.map(renderPlancha).join('')
    : emptyCard('No se han encontrado planchas.');
}

function renderPlancha(item) {
  const link = safeLink(driveViewUrl(item['Enlace / archivo']));
  const grade = item.Grado || '';

  return `
    <article class="content-card">
      <div class="card-topline">
        <span>${escapeHtml(item.Fecha || '')}</span>
        ${grade ? `<span class="pill">${escapeHtml(grade)}</span>` : ''}
      </div>
      <h4>${escapeHtml(item['Título'] || 'Sin título')}</h4>
      ${item.Autor ? `<p class="card-meta">${escapeHtml(item.Autor)}</p>` : ''}
      ${item.Tema ? `<p class="card-meta">${escapeHtml(item.Tema)}</p>` : ''}
      ${item.Resumen ? `<p>${escapeHtml(item.Resumen)}</p>` : ''}
      ${link ? `<p><a href="${link}" target="_blank" rel="noopener noreferrer">Abrir plancha</a></p>` : ''}
    </article>
  `;
}

export async function loadDocumentos() {
  const list = $('documentosList');
  list.innerHTML = loadingCards();

  try {
    const result = await apiGet('documentos');
    const items = result.items || [];
    state.loaded.documentos = true;

    list.innerHTML = items.length
      ? items.map(renderDocumento).join('')
      : emptyCard('No hay documentos visibles.');
  } catch (error) {
    list.innerHTML = errorCard(error.message);
  }
}

function renderDocumento(item) {
  const link = safeLink(driveViewUrl(item['Enlace / archivo']));
  const category = item['Categoría'] || '';

  return `
    <article class="content-card">
      <div class="card-topline">
        <span>${escapeHtml(item.Fecha || '')}</span>
        ${category ? `<span class="pill">${escapeHtml(category)}</span>` : ''}
      </div>
      <h4>${escapeHtml(item['Título'] || 'Sin título')}</h4>
      ${item['Descripción'] ? `<p>${escapeHtml(item['Descripción'])}</p>` : ''}
      ${link ? `<p><a href="${link}" target="_blank" rel="noopener noreferrer">Abrir documento</a></p>` : ''}
    </article>
  `;
}

export function resetLibrary() {
  papers = [];
  $('paperSearch').value = '';
  $('planchasList').innerHTML = '';
  $('documentosList').innerHTML = '';
}

export function bindLibrary() {
  $('paperSearch').addEventListener('input', renderPlanchas);
}
