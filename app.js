const TOKEN_KEY = 'europa110_session';

const loginView = document.getElementById('loginView');
const privateView = document.getElementById('privateView');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutButton = document.getElementById('logoutButton');

const userMeta = document.getElementById('userMeta');
const welcomeName = document.getElementById('welcomeName');

const agendaList = document.getElementById('agendaList');
const planchasList = document.getElementById('planchasList');
const documentosList = document.getElementById('documentosList');

const paperSearch = document.getElementById('paperSearch');

let currentUser = null;
let papersCache = [];


document.addEventListener('DOMContentLoaded', init);


async function init() {
  setupTabs();

  const token = localStorage.getItem(TOKEN_KEY);

  if (!token) {
    showLogin();
    return;
  }

  try {
    const result = await apiGet('me', token);

    if (!result.ok) {
      throw new Error(result.error || 'Sesión no válida');
    }

    currentUser = result.user;

    await enterPrivateArea(token);

  } catch (error) {
    localStorage.removeItem(TOKEN_KEY);
    showLogin();
  }
}


loginForm.addEventListener('submit', async event => {
  event.preventDefault();

  loginError.textContent = '';

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  const button = loginForm.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = 'Entrando…';

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action: 'login',
        username,
        password
      })
    });

    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.error || 'No se ha podido iniciar sesión.');
    }

    localStorage.setItem(TOKEN_KEY, result.token);

    currentUser = result.user;

    await enterPrivateArea(result.token);

  } catch (error) {
    loginError.textContent =
      error.message || 'No se ha podido conectar con el servidor.';
  } finally {
    button.disabled = false;
    button.textContent = 'Entrar';
  }
});


logoutButton.addEventListener('click', async () => {
  const token = localStorage.getItem(TOKEN_KEY);

  try {
    if (token) {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          action: 'logout',
          token
        })
      });
    }
  } catch (error) {
    // Aunque falle el servidor, cerramos la sesión local.
  }

  localStorage.removeItem(TOKEN_KEY);
  currentUser = null;
  showLogin();
});


async function enterPrivateArea(token) {
  showPrivate();

  welcomeName.textContent =
    currentUser && currentUser.name
      ? `Bienvenido, ${currentUser.name}`
      : 'Bienvenido';

  userMeta.textContent = [
    currentUser?.grade,
    currentUser?.role
  ]
    .filter(Boolean)
    .join(' · ');

  await Promise.all([
    loadAgenda(token),
    loadPlanchas(token),
    loadDocumentos(token)
  ]);
}


async function loadAgenda(token) {
  agendaList.innerHTML = loadingCard();

  try {
    const result = await apiGet('agenda', token);

    if (!result.ok) {
      throw new Error(result.error);
    }

    const items = result.items || [];

    if (!items.length) {
      agendaList.innerHTML = emptyCard('No hay próximas citas visibles.');
      return;
    }

    agendaList.innerHTML = items
      .map(renderAgendaItem)
      .join('');

  } catch (error) {
    agendaList.innerHTML = errorCard(error.message);
  }
}


async function loadPlanchas(token) {
  planchasList.innerHTML = loadingCard();

  try {
    const result = await apiGet('planchas', token);

    if (!result.ok) {
      throw new Error(result.error);
    }

    papersCache = result.items || [];
    renderPlanchas(papersCache);

  } catch (error) {
    planchasList.innerHTML = errorCard(error.message);
  }
}


async function loadDocumentos(token) {
  documentosList.innerHTML = loadingCard();

  try {
    const result = await apiGet('documentos', token);

    if (!result.ok) {
      throw new Error(result.error);
    }

    const items = result.items || [];

    if (!items.length) {
      documentosList.innerHTML = emptyCard('No hay documentos visibles.');
      return;
    }

    documentosList.innerHTML = items
      .map(renderDocumentoItem)
      .join('');

  } catch (error) {
    documentosList.innerHTML = errorCard(error.message);
  }
}


paperSearch.addEventListener('input', () => {
  const q = normalize(paperSearch.value);

  if (!q) {
    renderPlanchas(papersCache);
    return;
  }

  const filtered = papersCache.filter(item => {
    const haystack = [
      item['Título'],
      item['Autor'],
      item['Tema'],
      item['Resumen'],
      item['Curso'],
      item['Grado']
    ]
      .map(normalize)
      .join(' ');

    return haystack.includes(q);
  });

  renderPlanchas(filtered);
});


function renderPlanchas(items) {
  if (!items.length) {
    planchasList.innerHTML = emptyCard('No se han encontrado planchas.');
    return;
  }

  planchasList.innerHTML = items
    .map(renderPlanchaItem)
    .join('');
}


function renderAgendaItem(item) {
  const date = escapeHtml(item['Fecha'] || '');
  const time = escapeHtml(item['Hora'] || '');
  const title = escapeHtml(item['Título'] || 'Sin título');
  const type = escapeHtml(item['Tipo'] || '');
  const place = escapeHtml(item['Lugar'] || '');
  const description = escapeHtml(item['Descripción'] || '');
  const state = escapeHtml(item['Estado'] || '');
  const link = safeLink(item['Enlace / archivo']);

  return `
    <article class="content-card">
      <div class="card-topline">
        <span>${date}${time ? ` · ${time}` : ''}</span>
        ${state ? `<span class="pill">${state}</span>` : ''}
      </div>

      <h4>${title}</h4>

      ${type ? `<p class="card-meta">${type}</p>` : ''}
      ${place ? `<p class="card-meta">${place}</p>` : ''}
      ${description ? `<p>${description}</p>` : ''}

      ${link ? `
        <p>
          <a href="${link}" target="_blank" rel="noopener noreferrer">
            Abrir documento
          </a>
        </p>
      ` : ''}
    </article>
  `;
}


function renderPlanchaItem(item) {
  const title = escapeHtml(item['Título'] || 'Sin título');
  const author = escapeHtml(item['Autor'] || '');
  const date = escapeHtml(item['Fecha'] || '');
  const grade = escapeHtml(item['Grado'] || '');
  const topic = escapeHtml(item['Tema'] || '');
  const summary = escapeHtml(item['Resumen'] || '');
  const link = safeLink(item['Enlace / archivo']);

  return `
    <article class="content-card">
      <div class="card-topline">
        <span>${date}</span>
        ${grade ? `<span class="pill">${grade}</span>` : ''}
      </div>

      <h4>${title}</h4>

      ${author ? `<p class="card-meta">${author}</p>` : ''}
      ${topic ? `<p class="card-meta">${topic}</p>` : ''}
      ${summary ? `<p>${summary}</p>` : ''}

      ${link ? `
        <p>
          <a href="${link}" target="_blank" rel="noopener noreferrer">
            Abrir plancha
          </a>
        </p>
      ` : ''}
    </article>
  `;
}


function renderDocumentoItem(item) {
  const title = escapeHtml(item['Título'] || 'Sin título');
  const category = escapeHtml(item['Categoría'] || '');
  const date = escapeHtml(item['Fecha'] || '');
  const description = escapeHtml(item['Descripción'] || '');
  const link = safeLink(item['Enlace / archivo']);

  return `
    <article class="content-card">
      <div class="card-topline">
        <span>${date}</span>
        ${category ? `<span class="pill">${category}</span>` : ''}
      </div>

      <h4>${title}</h4>

      ${description ? `<p>${description}</p>` : ''}

      ${link ? `
        <p>
          <a href="${link}" target="_blank" rel="noopener noreferrer">
            Abrir documento
          </a>
        </p>
      ` : ''}
    </article>
  `;
}


async function apiGet(action, token) {
  const url = new URL(APPS_SCRIPT_URL);
  url.searchParams.set('action', action);

  if (token) {
    url.searchParams.set('token', token);
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error('Error de conexión con el servidor.');
  }

  return response.json();
}


function setupTabs() {
  const tabs = document.querySelectorAll('.tab');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      document
        .querySelectorAll('.content-panel')
        .forEach(panel => panel.classList.add('hidden'));

      const view = tab.dataset.view;
      const panel = document.getElementById(`${view}Panel`);

      if (panel) {
        panel.classList.remove('hidden');
      }
    });
  });
}


function showLogin() {
  loginView.classList.remove('hidden');
  privateView.classList.add('hidden');

  document.getElementById('password').value = '';
  loginError.textContent = '';
}


function showPrivate() {
  loginView.classList.add('hidden');
  privateView.classList.remove('hidden');
}


function safeLink(value) {
  const raw = String(value || '').trim();

  if (!raw) return '';

  try {
    const url = new URL(raw);

    if (
      url.protocol !== 'https:' &&
      url.protocol !== 'http:'
    ) {
      return '';
    }

    return escapeHtml(url.toString());

  } catch {
    return '';
  }
}


function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}


function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


function loadingCard() {
  return `
    <article class="content-card">
      <p>Cargando…</p>
    </article>
  `;
}


function emptyCard(message) {
  return `
    <article class="content-card">
      <p>${escapeHtml(message)}</p>
    </article>
  `;
}


function errorCard(message) {
  return `
    <article class="content-card">
      <p class="error">
        ${escapeHtml(message || 'Se ha producido un error.')}
      </p>
    </article>
  `;
}
