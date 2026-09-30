// Estado de la sesión en memoria. Se vacía al cerrar sesión.

export const state = {};

export function resetState() {
  Object.assign(state, {
    user: null,
    agenda: [],
    externos: [],
    tenidaData: {},        // datos extra de cada tenida, por ID
    tenidaFetchedAt: {},
    openTenidaId: '',
    management: null,
    formations: null,
    loaded: {}             // secciones que ya se han cargado
  });
}

resetState();

export function permissions() {
  return state.user?.permisos || {};
}
