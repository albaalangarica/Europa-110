// Cambio de pantalla (acceso / invitados / zona privada) y de sección dentro de la zona privada.

import { $ } from './utils.js';

const SCREENS = {
  login: 'loginView',
  guest: 'guestView',
  private: 'privateView'
};

const VIEWS = {
  agenda: 'agendaPanel',
  planchas: 'planchasPanel',
  documentos: 'documentosPanel',
  secretary: 'secretaryPanel',
  master: 'masterPanel',
  warden: 'wardenPanel',
  companion: 'companionPanel',
  'second-warden': 'secondWardenPanel',
  apprentice: 'apprenticePanel',
  tenida: 'tenidaDetailView'
};

const listeners = [];

export function onViewChange(listener) {
  listeners.push(listener);
}

export function showScreen(name) {
  Object.entries(SCREENS).forEach(([screen, id]) => {
    $(id)?.classList.toggle('hidden', screen !== name);
  });
  window.scrollTo(0, 0);
}

export function showView(view) {
  Object.entries(VIEWS).forEach(([name, id]) => {
    $(id)?.classList.toggle('hidden', name !== view);
  });

  // La ficha de una tenida pertenece a Agenda.
  const navView = view === 'tenida' ? 'agenda' : view;
  document.querySelectorAll('.bottom-nav [data-view]').forEach(button => {
    const active = button.dataset.view === navView;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });

  document.querySelector('.hello-block')?.classList.toggle('hidden', view === 'tenida');
  window.scrollTo(0, 0);

  listeners.forEach(listener => listener(view));
}
