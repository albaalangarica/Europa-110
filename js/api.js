// Comunicación con Apps Script. Todas las llamadas llevan el token de sesión.

import { APPS_SCRIPT_URL } from '../config.js';
import { storage } from './utils.js';

const TOKEN_KEY = 'europa110_session';

export const getToken = () => storage.get(TOKEN_KEY) || '';
export const setToken = token => storage.set(TOKEN_KEY, token);
export const clearToken = () => storage.remove(TOKEN_KEY);

const SESSION_ERROR = /sesi[oó]n (no v[aá]lida|ha caducado)|usuario no activo/i;

async function request(url, options) {
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new Error('No se ha podido conectar con el servidor.');
  }

  if (!response.ok) {
    throw new Error('Error de conexión con el servidor.');
  }

  const data = await response.json();

  if (!data?.ok) {
    const message = data?.error || 'Se ha producido un error.';
    if (SESSION_ERROR.test(message) && getToken()) {
      // La aplicación vuelve a la pantalla de acceso.
      window.dispatchEvent(new CustomEvent('session-expired', { detail: message }));
    }
    throw new Error(message);
  }

  return data;
}

export function apiGet(action, params = {}) {
  const url = new URL(APPS_SCRIPT_URL);
  url.searchParams.set('action', action);

  const token = getToken();
  if (token) url.searchParams.set('token', token);

  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  return request(url.toString(), { cache: 'no-store' });
}

export function apiPost(action, body = {}) {
  return request(APPS_SCRIPT_URL, {
    method: 'POST',
    // text/plain evita la petición previa CORS, que Apps Script no admite.
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, token: getToken(), ...body })
  });
}
