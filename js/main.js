// Arranque de la aplicación: acceso, sesión y navegación principal.

import { apiGet, apiPost, getToken, setToken, clearToken } from './api.js';
import { state, resetState } from './state.js';
import { showScreen, showView, onViewChange } from './nav.js';
import { $, escapeHtml, storage, todayText } from './utils.js';
import { AGENDA_CACHE_KEY, bindAgenda, loadAgenda } from './agenda.js';
import { bindLibrary, loadPlanchas, loadDocumentos, resetLibrary } from './library.js';
import { bindPanels, configureRoleNav, loadManagement, loadFormations, resetPanels } from './panels.js';
import { bindGuest, enterGuest } from './guest.js';

const USER_CACHE_KEY = 'europa110_user';
const USERS_LIST_KEY = 'europa110_users';
const LAST_USER_KEY = 'europa110_last_user';
const GUEST_HASH = '#invitado';


/* LISTA DE ACCESO */

function fillUserSelect(users) {
  const select = $('username');
  if (select.tagName !== 'SELECT') return;

  const last = storage.get(LAST_USER_KEY) || '';
  select.innerHTML = '<option value="" disabled>Selecciona tu nombre</option>' +
    users.map(user => `<option value="${escapeHtml(user.usuario)}">${escapeHtml(user.nombre)}</option>`).join('');
  select.value = users.some(user => user.usuario === last) ? last : '';
}

// Sin lista disponible, se deja escribir el usuario a mano.
function useTextUsername() {
  const select = $('username');
  if (select.tagName !== 'SELECT') return;

  const input = document.createElement('input');
  input.id = 'username';
  input.name = 'username';
  input.type = 'text';
  input.autocomplete = 'username';
  input.required = true;
  input.placeholder = 'Tu usuario';
  select.replaceWith(input);
}

async function loadUserList() {
  const cached = storage.getJSON(USERS_LIST_KEY, null);
  if (cached?.length) fillUserSelect(cached);

  try {
    const result = await apiGet('users');
    const users = result.users || [];
    storage.setJSON(USERS_LIST_KEY, users);
    if (users.length) fillUserSelect(users);
    else if (!cached?.length) useTextUsername();
  } catch {
    if (!cached?.length) useTextUsername();
  }
}


// La lista de nombres solo hace falta en la pantalla de acceso.
let userListRequested = false;

function showLogin() {
  showScreen('login');
  if (!userListRequested) {
    userListRequested = true;
    loadUserList();
  }
}


/* SESIÓN */

async function login(event) {
  event.preventDefault();

  const error = $('loginError');
  const button = event.currentTarget.querySelector('button[type="submit"]');
  const username = $('username').value.trim();
  const password = $('password').value;

  error.textContent = '';
  button.disabled = true;
  button.textContent = 'Entrando…';

  try {
    const result = await apiPost('login', { username, password });
    setToken(result.token);
    storage.set(LAST_USER_KEY, username);
    enterPrivate(result.user);
  } catch (err) {
    error.textContent = err.message || 'No se ha podido conectar con el servidor.';
  } finally {
    button.disabled = false;
    button.textContent = 'Entrar';
  }
}

function enterPrivate(user) {
  state.user = user;
  storage.setJSON(USER_CACHE_KEY, user);

  const name = user?.nombre || user?.usuario || '';
  $('welcomeName').textContent = name ? `Hola, ${name}` : 'Hola';
  $('todayText').textContent = todayText();
  $('avatarButton').textContent = name.charAt(0).toUpperCase() || '·';
  $('avatarButton').setAttribute('aria-label', name ? `Menú de ${name}` : 'Menú de usuario');

  configureRoleNav();
  showScreen('private');
  showView('agenda');
  loadAgenda();
}

// Limpia todo lo de la sesión: en un móvil compartido, nadie debe ver lo del anterior.
function clearSession() {
  clearToken();
  storage.remove(USER_CACHE_KEY);
  storage.remove(AGENDA_CACHE_KEY);

  resetState();
  resetLibrary();
  resetPanels();
  $('agendaList').innerHTML = '';
  $('tenidaDetailContent').innerHTML = '';
  $('password').value = '';
  $('avatarMenu').classList.add('hidden');
  showView('agenda');
}

function logout() {
  const token = getToken();
  if (token) apiPost('logout').catch(() => {});

  clearSession();
  showLogin();
}

function sessionExpired(event) {
  clearSession();
  showLogin();
  $('loginError').textContent = event.detail || 'La sesión ha caducado. Vuelve a entrar.';
}


/* NAVEGACIÓN */

// Cada sección se carga la primera vez que se abre.
function loadSection(view) {
  if (!state.user) return;

  if (view === 'planchas' && !state.loaded.planchas) loadPlanchas();
  if (view === 'documentos' && !state.loaded.documentos) loadDocumentos();
  if (view === 'secretary' || view === 'master') loadManagement();
  if (['warden', 'companion', 'second-warden', 'apprentice'].includes(view)) loadFormations();
}

function bindShell() {
  $('loginForm').addEventListener('submit', login);
  $('logoutButton').addEventListener('click', logout);
  window.addEventListener('session-expired', sessionExpired);

  $('guestEntryLink').addEventListener('click', event => {
    event.preventDefault();
    history.replaceState(null, '', GUEST_HASH);
    showScreen('guest');
    enterGuest();
  });

  $('guestExitButton').addEventListener('click', () => {
    history.replaceState(null, '', location.pathname + location.search);
    if (getToken() && state.user) enterPrivate(state.user);
    else showLogin();
  });

  document.querySelectorAll('.bottom-nav [data-view]').forEach(button => {
    button.addEventListener('click', () => {
      state.openTenidaId = '';
      showView(button.dataset.view);
    });
  });

  onViewChange(loadSection);

  const avatar = $('avatarButton');
  const menu = $('avatarMenu');

  avatar.addEventListener('click', event => {
    event.stopPropagation();
    const open = menu.classList.toggle('hidden') === false;
    avatar.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', event => {
    if (!menu.classList.contains('hidden') && !menu.contains(event.target)) {
      menu.classList.add('hidden');
      avatar.setAttribute('aria-expanded', 'false');
    }
  });
}


/* ARRANQUE */

async function start() {
  bindShell();
  bindAgenda();
  bindLibrary();
  bindPanels();
  bindGuest();

  if (location.hash === GUEST_HASH) {
    showScreen('guest');
    enterGuest();
  }

  const token = getToken();
  const cachedUser = storage.getJSON(USER_CACHE_KEY, null);

  if (!token) {
    if (location.hash !== GUEST_HASH) showLogin();
    return;
  }

  // Con sesión guardada mostramos la app al momento; el servidor la valida después.
  if (cachedUser && location.hash !== GUEST_HASH) enterPrivate(cachedUser);

  try {
    const result = await apiGet('me');
    if (location.hash === GUEST_HASH) {
      state.user = result.user;
      return;
    }

    if (!cachedUser) {
      enterPrivate(result.user);
    } else {
      // Por si han cambiado cargos o nombre desde la última vez.
      state.user = result.user;
      storage.setJSON(USER_CACHE_KEY, result.user);
      configureRoleNav();
    }
  } catch {
    if (!getToken()) return; // ya gestionado como sesión caducada
    // Sin conexión: si había datos guardados, seguimos con ellos.
    if (!cachedUser && location.hash !== GUEST_HASH) {
      clearToken();
      showLogin();
    }
  }
}

start();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}
