const SPREADSHEET_ID = '1HSVNUcExd0_RrU5zKd83vaIVaNno7glatV6JyjBWKCY';

// Memoria de la petición en curso: Apps Script la vacía al terminar.
const REQUEST_MEMO = { ss: null, rows: {} };

function getSpreadsheet() {
  if (!REQUEST_MEMO.ss) REQUEST_MEMO.ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return REQUEST_MEMO.ss;
}

const SHEETS = {
  USUARIOS: 'Usuarios',
  AGENDA: 'Agenda',
  PLANCHAS: 'Planchas',
  DOCUMENTOS: 'Documentos',
  ASISTENCIA: 'Asistencia',
  INVITADOS: 'Invitados',
  FORMACION: 'Formación',
  TRONCO: 'Tronco de la Viuda',
  OTRAS_LOGIAS: 'Otras logias'
};

const SESSION_PREFIX = 'europa110_session_';
const SESSION_TTL_SECONDS = 21600; // 6 horas

const GRADE_RANK = {
  'aprendiz': 1,
  'companero': 2,
  'maestro': 3
};

const FORMATION_LEVELS = ['Compañero', 'Aprendiz'];

// Lo leído de cada pestaña se guarda un rato para no releer el Sheet en cada
// petición. Los cambios hechos desde la app lo borran al momento; los hechos a
// mano en el Sheet tardan como mucho este tiempo en verse.
const SHEET_CACHE_SECONDS = 60;
const SHEET_CACHE_PREFIX = 'europa110_rows_v1_';


/* =========================================================
   ENTRADA
   ========================================================= */

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = String(params.action || 'status').trim().toLowerCase();
    const token = String(params.token || '').trim();

    if (action === 'status') {
      return jsonResponse({
        ok: true,
        app: 'Europa 110',
        status: 'online'
      });
    }

    // Públicas: no requieren sesión.
    if (action === 'users') {
      return jsonResponse({ ok: true, users: getLoginUsers() });
    }

    if (action === 'guest') {
      return jsonResponse({ ok: true, data: getGuestData() });
    }

    // Privadas.
    const session = requireSession(token);
    const user = session.user;

    if (action === 'me') {
      return jsonResponse({ ok: true, user: publicUser(user) });
    }

    if (action === 'agenda') {
      const items = getVisibleRows(SHEETS.AGENDA, user);

      // Añadimos, si existe, la respuesta de asistencia del usuario a cada tenida.
      const attendanceMap = getAttendanceMapForUser(user.Usuario);

      const enriched = items.map(item => {
        const id = String(item.ID || '').trim();
        return Object.assign({}, item, {
          'Mi asistencia': attendanceMap[id] || ''
        });
      });

      return jsonResponse({
        ok: true,
        items: enriched,
        externos: getOtherLodgeEvents(user)
      });
    }

    if (action === 'tenida') {
      const tenidaId = String(params.tenidaId || '').trim();
      const item = findAgendaById(tenidaId);

      if (!item || !isVisibleForUser(item, user)) {
        throw new Error('La tenida no existe.');
      }

      return jsonResponse({ ok: true, data: getTenidaData(item, user) });
    }

    if (action === 'planchas') {
      return jsonResponse({
        ok: true,
        items: getVisibleRows(SHEETS.PLANCHAS, user)
      });
    }

    if (action === 'documentos') {
      return jsonResponse({
        ok: true,
        items: getVisibleRows(SHEETS.DOCUMENTOS, user)
      });
    }

    if (action === 'formation' || action === 'formacion') {
      return jsonResponse({
        ok: true,
        data: getFormationForUser(user)
      });
    }

    if (action === 'management') {
      if (!permissionsFor(user).gestion) {
        throw new Error('No tienes acceso a este panel.');
      }
      return jsonResponse({ ok: true, data: getManagementData() });
    }

    if (action === 'attendance') {
      return jsonResponse({
        ok: true,
        items: getAttendanceForUser(user.Usuario)
      });
    }

    return jsonResponse({
      ok: false,
      error: 'Acción no válida.'
    });

  } catch (error) {
    return jsonResponse({
      ok: false,
      error: cleanError(error)
    });
  }
}

function doPost(e) {
  try {
    const data = parsePostData(e);
    const action = String(data.action || '').trim().toLowerCase();

    if (action === 'login') {
      return handleLogin(data);
    }

    if (action === 'logout') {
      return handleLogout(data);
    }

    if (action === 'attendance' || action === 'asistencia' || action === 'save_attendance') {
      return handleAttendance(data);
    }

    if (action === 'attendance_admin') {
      return handleAttendanceAdmin(data);
    }

    if (action === 'formation' || action === 'formacion') {
      return handleFormation(data);
    }

    if (action === 'tronco') {
      return handleTronco(data);
    }

    if (action === 'guest_signup') {
      return handleGuestSignup(data);
    }

    return jsonResponse({
      ok: false,
      error: 'Acción no válida.'
    });

  } catch (error) {
    return jsonResponse({
      ok: false,
      error: cleanError(error)
    });
  }
}


/* =========================================================
   SESIÓN
   ========================================================= */

function handleLogin(data) {
  const usuarioInput = normalizeText(data.username || data.usuario || data.user || '');
  const passwordInput = String(data.password || data.contrasena || '').trim();

  if (!usuarioInput || !passwordInput) {
    throw new Error('Introduce usuario y contraseña.');
  }

  const users = sheetToObjects(SHEETS.USUARIOS);

  const user = users.find(row => {
    const active = normalizeText(row.Activo) === 'si';
    const sameUser = normalizeText(row.Usuario) === usuarioInput;
    const samePassword = String(row['Contraseña'] || '').trim() === passwordInput;
    return active && sameUser && samePassword;
  });

  if (!user) {
    throw new Error('Usuario o contraseña incorrectos.');
  }

  const token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  const session = {
    createdAt: new Date().toISOString(),
    user: user
  };

  CacheService.getScriptCache().put(
    SESSION_PREFIX + token,
    JSON.stringify(session),
    SESSION_TTL_SECONDS
  );

  updateLastAccess(user.Usuario);

  return jsonResponse({
    ok: true,
    token: token,
    user: publicUser(user)
  });
}

function handleLogout(data) {
  const token = String(data.token || '').trim();

  if (token) {
    CacheService.getScriptCache().remove(SESSION_PREFIX + token);
  }

  return jsonResponse({ ok: true });
}

function requireSession(token) {
  if (!token) {
    throw new Error('Sesión no válida.');
  }

  const cache = CacheService.getScriptCache();
  const raw = cache.get(SESSION_PREFIX + token);

  if (!raw) {
    throw new Error('La sesión ha caducado. Vuelve a entrar.');
  }

  let session;
  try {
    session = JSON.parse(raw);
  } catch (error) {
    cache.remove(SESSION_PREFIX + token);
    throw new Error('Sesión no válida.');
  }

  // Revalidamos el usuario contra la hoja para que desactivar una cuenta tenga efecto.
  const users = sheetToObjects(SHEETS.USUARIOS);
  const current = users.find(row =>
    normalizeText(row.Usuario) === normalizeText(session.user.Usuario)
  );

  if (!current || normalizeText(current.Activo) !== 'si') {
    cache.remove(SESSION_PREFIX + token);
    throw new Error('Usuario no activo.');
  }

  session.user = current;

  // Renovamos la sesión con cada uso.
  cache.put(
    SESSION_PREFIX + token,
    JSON.stringify(session),
    SESSION_TTL_SECONDS
  );

  return session;
}

// Lista para el desplegable de acceso. Solo el nombre de usuario,
// nunca el nombre completo, porque este endpoint es público.
function getLoginUsers() {
  return sheetToObjects(SHEETS.USUARIOS)
    .filter(row => normalizeText(row.Activo) === 'si' && String(row.Usuario || '').trim())
    .map(row => {
      const usuario = String(row.Usuario).trim();
      return {
        usuario: usuario,
        nombre: usuario.charAt(0).toUpperCase() + usuario.slice(1)
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}


/* =========================================================
   CARGOS Y PERMISOS
   La columna "Cargos" de Usuarios admite varios, separados por comas.
   También se tiene en cuenta la columna "Rol".
   ========================================================= */

function userCargos(user) {
  return String((user && user.Cargos) || '')
    .split(/[,;|\n]/)
    .map(v => v.trim())
    .filter(Boolean);
}

function hasCargo(user, keyword) {
  const rol = normalizeText(user && user.Rol);
  return rol.indexOf(keyword) !== -1 ||
    userCargos(user).some(cargo => normalizeText(cargo).indexOf(keyword) !== -1);
}

function permissionsFor(user) {
  const secretaria = hasCargo(user, 'secretari');
  const venerable = hasCargo(user, 'venerable');
  const primerVigilante = hasCargo(user, 'primer vigilante');
  const segundoVigilante = hasCargo(user, 'segundo vigilante');

  const publicar = [];
  if (primerVigilante || hasCargo(user, 'formacion companeros')) publicar.push('Compañero');
  if (segundoVigilante || hasCargo(user, 'formacion aprendices')) publicar.push('Aprendiz');

  // Cada Compañero y cada Aprendiz ve las formaciones de su grado.
  const ver = publicar.slice();
  const grado = normalizeText(user && user.Grado);
  FORMATION_LEVELS.forEach(level => {
    if (grado === normalizeText(level) && ver.indexOf(level) === -1) ver.push(level);
  });

  return {
    secretaria: secretaria,
    venerable: venerable,
    gestion: secretaria || venerable,
    // Secretaría puede marcar la asistencia de cualquiera.
    asistencia: secretaria,
    primerVigilante: primerVigilante,
    segundoVigilante: segundoVigilante,
    tronco: normalizeText(user && user.Rol) === 'administrador' ||
      secretaria ||
      hasCargo(user, 'tronco') ||
      hasCargo(user, 'tesorer') ||
      hasCargo(user, 'hospitalari'),
    formacion: {
      publicar: publicar,
      ver: ver
    }
  };
}

function publicUser(user) {
  return {
    usuario: user.Usuario || '',
    nombre: user['Nombre mostrado'] || user.Usuario || '',
    grado: user.Grado || '',
    rol: user.Rol || '',
    cargos: userCargos(user),
    permisos: permissionsFor(user)
  };
}


/* =========================================================
   AGENDA Y TENIDAS
   ========================================================= */

function findAgendaById(id) {
  const target = String(id || '').trim();
  if (!target) return null;
  const rows = sheetToObjects(SHEETS.AGENDA);
  return rows.find(row => String(row.ID || '').trim() === target) || null;
}

function getTenidaData(item, user) {
  const id = String(item.ID || '').trim();
  const attendanceMap = getAttendanceMapForUser(user.Usuario);

  const planchas = getVisibleRows(SHEETS.PLANCHAS, user)
    .filter(row => String(row['Tenida ID'] || '').trim() === id);

  const data = {
    tenida: Object.assign({}, item, { 'Mi asistencia': attendanceMap[id] || '' }),
    planchas: planchas,
    tronco: findTronco(id)
  };

  if (permissionsFor(user).gestion) {
    data.attendanceSummary = buildAttendanceSummaries([item])[0] || null;
  }

  return data;
}

function getOtherLodgeEvents(user) {
  if (!sheetExists(SHEETS.OTRAS_LOGIAS)) return [];

  return sheetToObjects(SHEETS.OTRAS_LOGIAS)
    .filter(row => isVisibleForUser(row, user))
    .map((row, index) => ({
      id: String(row.ID || '').trim() || 'EXT-' + (index + 1),
      fecha: isoDate(row.Fecha),
      hora: row.Hora || '',
      presencia: row.Presencia || '',
      titulo: row['Título'] || '',
      logia: row.Logia || '',
      lugar: row.Lugar || '',
      grado: row.Grado || '',
      tipo: row.Tipo || '',
      informacion: row['Información'] || '',
      observaciones: row.Observaciones || ''
    }))
    .filter(event => event.fecha);
}


/* =========================================================
   ASISTENCIA
   ========================================================= */

function handleAttendance(data) {
  const token = String(data.token || '').trim();
  const tenidaId = String(data.tenidaId || data.tenida_id || '').trim();
  const respuestaRaw = String(data.respuesta || '').trim();

  const session = requireSession(token);

  if (!tenidaId) {
    throw new Error('Falta identificar la tenida.');
  }

  const respuesta = normalizeAttendanceAnswer(respuestaRaw);
  if (!respuesta) {
    throw new Error('Respuesta de asistencia no válida.');
  }

  const agendaItem = findAgendaById(tenidaId);

  if (!agendaItem) {
    throw new Error('La tenida no existe.');
  }

  if (!isVisibleForUser(agendaItem, session.user)) {
    throw new Error('No tienes acceso a esta tenida.');
  }

  if (!attendanceWindowIsOpen(agendaItem.Fecha)) {
    throw new Error('La confirmación se abre 10 días antes de la tenida.');
  }

  const result = upsertAttendance({
    tenidaId: tenidaId,
    fechaTenida: agendaItem.Fecha || '',
    usuario: session.user.Usuario || '',
    nombre: session.user['Nombre mostrado'] || session.user.Usuario || '',
    respuesta: respuesta
  });

  return jsonResponse({
    ok: true,
    attendance: result
  });
}

// Secretaría marca la asistencia de otra persona, sin el límite de 10 días.
function handleAttendanceAdmin(data) {
  const session = requireSession(String(data.token || '').trim());

  if (!permissionsFor(session.user).asistencia) {
    throw new Error('No tienes permiso para marcar la asistencia de otros.');
  }

  const tenidaId = String(data.tenidaId || '').trim();
  const respuesta = normalizeAttendanceAnswer(data.respuesta);
  const agendaItem = findAgendaById(tenidaId);

  if (!agendaItem) {
    throw new Error('La tenida no existe.');
  }

  if (!respuesta) {
    throw new Error('Respuesta de asistencia no válida.');
  }

  const target = sheetToObjects(SHEETS.USUARIOS).find(row =>
    normalizeText(row.Usuario) === normalizeText(data.usuario)
  );

  if (!target) {
    throw new Error('Esa persona no está en la hoja Usuarios.');
  }

  const result = upsertAttendance({
    tenidaId: tenidaId,
    fechaTenida: agendaItem.Fecha || '',
    usuario: target.Usuario || '',
    nombre: target['Nombre mostrado'] || target.Usuario || '',
    respuesta: respuesta
  });

  return jsonResponse({
    ok: true,
    attendance: result
  });
}

function ensureAttendanceSheet() {
  return ensureSheetWithHeaders(SHEETS.ASISTENCIA, [
    'Tenida ID',
    'Fecha tenida',
    'Usuario',
    'Nombre',
    'Respuesta',
    'Fecha respuesta',
    'Actualizado'
  ]);
}

function upsertAttendance(data) {
  const sheet = ensureAttendanceSheet();
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(v => String(v || '').trim());

  const indexes = {
    tenidaId: headers.indexOf('Tenida ID'),
    fechaTenida: headers.indexOf('Fecha tenida'),
    usuario: headers.indexOf('Usuario'),
    nombre: headers.indexOf('Nombre'),
    respuesta: headers.indexOf('Respuesta'),
    fechaRespuesta: headers.indexOf('Fecha respuesta'),
    actualizado: headers.indexOf('Actualizado')
  };

  const required = Object.values(indexes);
  if (required.some(i => i === -1)) {
    throw new Error('La hoja Asistencia no tiene la estructura esperada.');
  }

  const targetTenida = String(data.tenidaId || '').trim();
  const targetUser = normalizeText(data.usuario || '');
  const now = new Date();

  for (let r = 1; r < values.length; r++) {
    const sameTenida = String(values[r][indexes.tenidaId] || '').trim() === targetTenida;
    const sameUser = normalizeText(values[r][indexes.usuario]) === targetUser;

    if (sameTenida && sameUser) {
      sheet.getRange(r + 1, indexes.fechaTenida + 1).setValue(data.fechaTenida || '');
      sheet.getRange(r + 1, indexes.nombre + 1).setValue(data.nombre || '');
      sheet.getRange(r + 1, indexes.respuesta + 1).setValue(data.respuesta);
      sheet.getRange(r + 1, indexes.fechaRespuesta + 1).setValue(now);
      sheet.getRange(r + 1, indexes.actualizado + 1).setValue(now);
      invalidateSheet(SHEETS.ASISTENCIA);

      return {
        tenidaId: targetTenida,
        usuario: data.usuario,
        respuesta: data.respuesta,
        actualizado: now.toISOString()
      };
    }
  }

  invalidateSheet(SHEETS.ASISTENCIA);

  sheet.appendRow([
    targetTenida,
    data.fechaTenida || '',
    data.usuario || '',
    data.nombre || '',
    data.respuesta,
    now,
    now
  ]);

  return {
    tenidaId: targetTenida,
    usuario: data.usuario,
    respuesta: data.respuesta,
    actualizado: now.toISOString()
  };
}

function getAttendanceRows() {
  return sheetExists(SHEETS.ASISTENCIA) ? sheetToObjects(SHEETS.ASISTENCIA) : [];
}

function getAttendanceForUser(usuario) {
  return getAttendanceRows()
    .filter(row => normalizeText(row.Usuario) === normalizeText(usuario));
}

function getAttendanceMapForUser(usuario) {
  const items = getAttendanceForUser(usuario);
  const map = {};

  items.forEach(item => {
    const id = String(item['Tenida ID'] || '').trim();
    if (id) {
      map[id] = String(item.Respuesta || '').trim();
    }
  });

  return map;
}

// Resumen sí / no / pendientes de cada tenida, para Secretaría y Venerable.
function buildAttendanceSummaries(agendaItems) {
  const users = sheetToObjects(SHEETS.USUARIOS)
    .filter(user => normalizeText(user.Activo) === 'si');
  const answers = getAttendanceRows();

  return agendaItems.map(item => {
    const id = String(item.ID || '').trim();
    const si = [];
    const no = [];
    const answered = {};
    const personas = [];

    answers
      .filter(row => String(row['Tenida ID'] || '').trim() === id)
      .forEach(row => {
        const name = row.Nombre || row.Usuario || '';
        answered[normalizeText(row.Usuario)] = true;
        if (row.Respuesta === 'Sí') si.push(name);
        else if (row.Respuesta === 'No') no.push(name);
        personas.push({ usuario: row.Usuario || '', nombre: name, respuesta: row.Respuesta || '' });
      });

    const pendingUsers = users
      .filter(user => !answered[normalizeText(user.Usuario)] && isVisibleForUser(item, user));

    pendingUsers.forEach(user => {
      personas.push({
        usuario: user.Usuario || '',
        nombre: user['Nombre mostrado'] || user.Usuario || '',
        respuesta: ''
      });
    });

    personas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

    return {
      tenidaId: id,
      titulo: item['Título'] || 'Tenida',
      fecha: item.Fecha || '',
      si: si,
      no: no,
      pendientes: pendingUsers.map(user => user['Nombre mostrado'] || user.Usuario),
      personas: personas
    };
  });
}

function attendanceWindowIsOpen(dateValue) {
  const eventDate = parseFlexibleDate(dateValue);
  if (!eventDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  eventDate.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((eventDate.getTime() - today.getTime()) / 86400000);
  return diffDays >= 0 && diffDays <= 10;
}

function normalizeAttendanceAnswer(value) {
  const raw = normalizeText(value);

  if (['si', 'confirmo', 'asisto', 'confirmado'].includes(raw)) {
    return 'Sí';
  }

  if (['no', 'no asistire', 'ausente', 'no asisto'].includes(raw)) {
    return 'No';
  }

  return '';
}


/* =========================================================
   PANEL DE SECRETARÍA / VENERABLE
   ========================================================= */

function getManagementData() {
  // Una plancha está "sin leer" mientras no se asigne a ninguna tenida.
  const unreadPapers = sheetToObjects(SHEETS.PLANCHAS)
    .filter(row => !String(row['Tenida ID'] || '').trim());

  // Confirmaciones de las tenidas desde hace 30 días en adelante.
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - 30);

  const tenidas = sheetToObjects(SHEETS.AGENDA).filter(row => {
    const date = parseFlexibleDate(row.Fecha);
    return String(row.ID || '').trim() && date && date >= from;
  });

  return {
    unreadPapers: unreadPapers,
    attendance: buildAttendanceSummaries(tenidas),
    tronco: getTroncoRows()
  };
}


/* =========================================================
   TRONCO DE LA VIUDA
   ========================================================= */

const TRONCO_HEADERS = [
  'Tenida ID',
  'Fecha tenida',
  'Tenida',
  'Importe',
  'Registrado por',
  'Fecha de registro',
  'Observaciones',
  'Actualizado'
];

function ensureTroncoSheet() {
  return ensureSheetWithHeaders(SHEETS.TRONCO, TRONCO_HEADERS);
}

function getTroncoRows() {
  return sheetExists(SHEETS.TRONCO) ? sheetToObjects(SHEETS.TRONCO) : [];
}

function findTronco(tenidaId) {
  const id = String(tenidaId || '').trim();
  return getTroncoRows().find(row => String(row['Tenida ID'] || '').trim() === id) || null;
}

function handleTronco(data) {
  const session = requireSession(String(data.token || '').trim());

  if (!permissionsFor(session.user).tronco) {
    throw new Error('No tienes permiso para registrar el Tronco de la Viuda.');
  }

  const tenidaId = String(data.tenidaId || '').trim();
  const importe = Number(String(data.importe || '').trim().replace(',', '.'));
  const observaciones = String(data.observaciones || '').trim();

  if (!Number.isFinite(importe) || importe < 0) {
    throw new Error('Introduce un importe válido.');
  }

  const agendaItem = findAgendaById(tenidaId);
  if (!agendaItem) {
    throw new Error('La tenida no existe.');
  }

  const sheet = ensureTroncoSheet();
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(v => String(v || '').trim());
  const col = name => headers.indexOf(name);

  const rowValues = {
    'Tenida ID': tenidaId,
    'Fecha tenida': agendaItem.Fecha || '',
    'Tenida': agendaItem['Título'] || 'Tenida',
    'Importe': importe,
    'Observaciones': observaciones,
    'Registrado por': session.user['Nombre mostrado'] || session.user.Usuario || '',
    'Actualizado': new Date()
  };

  let rowNumber = 0;
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][col('Tenida ID')] || '').trim() === tenidaId) {
      rowNumber = r + 1;
      break;
    }
  }

  if (!rowNumber) {
    rowNumber = sheet.getLastRow() + 1;
    rowValues['Fecha de registro'] = rowValues.Actualizado;
  }

  Object.keys(rowValues).forEach(name => {
    if (col(name) === -1) return;
    // Si no hay observaciones nuevas, conservamos las que hubiera.
    if (name === 'Observaciones' && !observaciones) return;
    sheet.getRange(rowNumber, col(name) + 1).setValue(rowValues[name]);
  });

  invalidateSheet(SHEETS.TRONCO);

  return jsonResponse({
    ok: true,
    tronco: {
      'Tenida ID': tenidaId,
      'Fecha tenida': rowValues['Fecha tenida'],
      'Tenida': rowValues.Tenida,
      'Importe': importe
    }
  });
}


/* =========================================================
   FORMACIÓN
   ========================================================= */

function ensureFormationSheet() {
  return ensureSheetWithHeaders(SHEETS.FORMACION, [
    'ID',
    'Nivel',
    'Título',
    'Fecha',
    'Nota',
    'Enlaces',
    'Publicado por',
    'Fecha publicación',
    'Activo'
  ]);
}

function handleFormation(data) {
  const token = String(data.token || '').trim();
  const session = requireSession(token);
  const publicar = permissionsFor(session.user).formacion.publicar;

  if (!publicar.length) {
    throw new Error('No tienes permiso para publicar formaciones.');
  }

  // Si puede publicar en varios niveles, el navegador indica cuál.
  const requested = FORMATION_LEVELS.find(level => normalizeText(level) === normalizeText(data.nivel));
  const nivel = requested || publicar[0];

  if (publicar.indexOf(nivel) === -1) {
    throw new Error('No tienes permiso para publicar formaciones de ese grado.');
  }

  const titulo = String(data.titulo || data.title || '').trim();
  const fecha = String(data.fecha || data.date || '').trim();
  const nota = String(data.nota || data.note || '').trim();
  let enlaces = data.enlaces || data.links || [];

  if (!titulo) {
    throw new Error('El título es obligatorio.');
  }

  if (!Array.isArray(enlaces)) {
    enlaces = String(enlaces || '').split(/\r?\n/);
  }

  enlaces = enlaces
    .map(x => String(x || '').trim())
    .filter(Boolean);

  if (enlaces.some(url => !/^https?:\/\//i.test(url))) {
    throw new Error('Los enlaces deben empezar por http:// o https://');
  }

  const sheet = ensureFormationSheet();
  const id = 'FORM-' + Utilities.getUuid();
  const now = new Date();
  const publishedBy = session.user['Nombre mostrado'] || session.user.Usuario || '';

  sheet.appendRow([
    id,
    nivel,
    titulo,
    fecha,
    nota,
    JSON.stringify(enlaces),
    publishedBy,
    now,
    'Sí'
  ]);

  invalidateSheet(SHEETS.FORMACION);

  return jsonResponse({
    ok: true,
    formation: {
      ID: id,
      Nivel: nivel,
      'Título': titulo,
      Fecha: fecha,
      Nota: nota,
      Enlaces: enlaces,
      'Publicado por': publishedBy,
      'Fecha publicación': now.toISOString(),
      Activo: 'Sí'
    }
  });
}

function getFormationForUser(user) {
  const ver = permissionsFor(user).formacion.ver.map(normalizeText);

  if (!ver.length) {
    return [];
  }

  if (!sheetExists(SHEETS.FORMACION)) {
    return [];
  }

  const rows = sheetToObjects(SHEETS.FORMACION);

  return rows
    .filter(row => {
      const active = !String(row.Activo || '').trim() || normalizeText(row.Activo) === 'si';
      return active && ver.indexOf(normalizeText(row.Nivel)) !== -1;
    })
    .map(row => {
      let links = [];
      try {
        links = JSON.parse(String(row.Enlaces || '[]'));
        if (!Array.isArray(links)) links = [];
      } catch (_) {
        links = String(row.Enlaces || '')
          .split(/\r?\n/)
          .map(x => x.trim())
          .filter(Boolean);
      }

      return {
        ID: row.ID || '',
        Nivel: row.Nivel || '',
        'Título': row['Título'] || '',
        Fecha: row.Fecha || '',
        Nota: row.Nota || '',
        Enlaces: links,
        'Publicado por': row['Publicado por'] || '',
        'Fecha publicación': row['Fecha publicación'] || '',
        Activo: row.Activo || ''
      };
    });
}


/* =========================================================
   INVITADOS (zona pública)
   ========================================================= */

// Solo datos pensados para visitantes: nunca el orden del día ni documentos internos.
function getGuestData() {
  const planchas = sheetToObjects(SHEETS.PLANCHAS)
    .filter(row => normalizeText(row['Pública']) === 'si')
    .map(row => ({
      tenidaId: String(row['Tenida ID'] || '').trim(),
      titulo: row['Título'] || 'Plancha',
      autor: row.Autor || '',
      url: httpUrl(row['Enlace / archivo'])
    }));

  const tenidas = sheetToObjects(SHEETS.AGENDA)
    .filter(row => normalizeText(row['Público']) === 'si')
    .map(row => {
      const id = String(row.ID || '').trim();
      return {
        id: id,
        fecha: isoDate(row.Fecha),
        titulo: row['Título'] || 'Tenida',
        tipo: row.Tipo || '',
        hora: row.Hora || '',
        lugar: row.Lugar || '',
        convocatoria: httpUrl(row['Convocatoria invitados']),
        planchas: planchas.filter(p => id && p.tenidaId === id)
      };
    })
    .filter(tenida => tenida.id && tenida.fecha)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  return {
    tenidas: tenidas,
    planchas: planchas
  };
}

function handleGuestSignup(data) {
  const tenidaId = String(data.tenidaId || data.tenida_id || '').trim();
  const nombre = String(data.nombre || '').trim();
  const logia = String(data.logia || data['Logia de procedencia'] || '').trim();

  if (!tenidaId) {
    throw new Error('Falta identificar la tenida.');
  }

  if (!nombre) {
    throw new Error('Escribe tu nombre.');
  }

  if (!logia) {
    throw new Error('Escribe tu logia de procedencia.');
  }

  if (nombre.length > 120 || logia.length > 160) {
    throw new Error('Los datos introducidos son demasiado largos.');
  }

  const agendaItem = findAgendaById(tenidaId);

  if (!agendaItem || normalizeText(agendaItem['Público']) !== 'si') {
    throw new Error('La tenida no existe.');
  }

  const eventDate = parseFlexibleDate(agendaItem.Fecha);
  if (eventDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);

    if (eventDate < today) {
      throw new Error('Esta tenida ya ha pasado.');
    }
  }

  const result = saveGuestSignup({
    tenidaId: tenidaId,
    fechaTenida: agendaItem.Fecha || '',
    tenida: agendaItem['Título'] || 'Tenida',
    nombre: nombre,
    logia: logia
  });

  return jsonResponse({
    ok: true,
    signup: result
  });
}

function ensureInvitadosSheet() {
  return ensureSheetWithHeaders(SHEETS.INVITADOS, [
    'Tenida ID',
    'Fecha tenida',
    'Tenida',
    'Nombre',
    'Logia de procedencia',
    'Fecha de inscripción',
    'Estado',
    'Observaciones'
  ]);
}

function saveGuestSignup(data) {
  const sheet = ensureInvitadosSheet();
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(v => String(v || '').trim());

  const idx = {
    tenidaId: headers.indexOf('Tenida ID'),
    fechaTenida: headers.indexOf('Fecha tenida'),
    tenida: headers.indexOf('Tenida'),
    nombre: headers.indexOf('Nombre'),
    logia: headers.indexOf('Logia de procedencia'),
    fechaInscripcion: headers.indexOf('Fecha de inscripción'),
    estado: headers.indexOf('Estado'),
    observaciones: headers.indexOf('Observaciones')
  };

  if (Object.values(idx).some(i => i === -1)) {
    throw new Error('La hoja Invitados no tiene la estructura esperada.');
  }

  const normalizedName = normalizeText(data.nombre);
  const normalizedLodge = normalizeText(data.logia);
  const tenidaId = String(data.tenidaId || '').trim();

  // Evita duplicados si el mismo visitante pulsa dos veces.
  for (let r = 1; r < values.length; r++) {
    const sameTenida = String(values[r][idx.tenidaId] || '').trim() === tenidaId;
    const sameName = normalizeText(values[r][idx.nombre]) === normalizedName;
    const sameLodge = normalizeText(values[r][idx.logia]) === normalizedLodge;

    if (sameTenida && sameName && sameLodge) {
      return {
        tenidaId: tenidaId,
        nombre: data.nombre,
        logia: data.logia,
        alreadyRegistered: true
      };
    }
  }

  const now = new Date();

  sheet.appendRow([
    tenidaId,
    data.fechaTenida || '',
    data.tenida || '',
    data.nombre || '',
    data.logia || '',
    now,
    'Apuntado',
    ''
  ]);

  invalidateSheet(SHEETS.INVITADOS);

  return {
    tenidaId: tenidaId,
    nombre: data.nombre,
    logia: data.logia,
    alreadyRegistered: false,
    registrado: now.toISOString()
  };
}


/* =========================================================
   VISIBILIDAD
   ========================================================= */

function getVisibleRows(sheetName, user) {
  return sheetToObjects(sheetName).filter(row => isVisibleForUser(row, user));
}

function isVisibleForUser(row, user) {
  const userGrade = gradeRank(user.Grado);
  const minGradeRaw = String(row['Grado mínimo'] || '').trim();

  // Si la fila tiene columna "Grado mínimo", exigimos un valor válido.
  if (Object.prototype.hasOwnProperty.call(row, 'Grado mínimo')) {
    const minGrade = gradeRank(minGradeRaw);
    if (!minGrade) return false;
    if (userGrade < minGrade) return false;
  }

  const visibleFor = normalizeText(row['Visible para'] || 'todos');

  if (!visibleFor || visibleFor === 'todos') {
    return true;
  }

  const usuario = normalizeText(user.Usuario);
  const rol = normalizeText(user.Rol);
  const grado = normalizeText(user.Grado);
  const cargos = userCargos(user).map(normalizeText);

  const allowed = visibleFor
    .split(/[,;|]/)
    .map(v => normalizeText(v))
    .filter(Boolean);

  return allowed.includes(usuario) ||
         allowed.includes(rol) ||
         allowed.includes(grado) ||
         allowed.includes('todos') ||
         cargos.some(cargo => allowed.includes(cargo));
}

function gradeRank(value) {
  return GRADE_RANK[normalizeText(value)] || 0;
}


/* =========================================================
   UTILIDADES DE HOJAS
   ========================================================= */

function getSheet(sheetName) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error('No existe la hoja "' + sheetName + '".');
  }

  return sheet;
}

function sheetToObjects(sheetName) {
  if (REQUEST_MEMO.rows[sheetName]) {
    return REQUEST_MEMO.rows[sheetName];
  }

  const cache = CacheService.getScriptCache();
  const cached = cache.get(SHEET_CACHE_PREFIX + sheetName);
  if (cached) {
    try {
      REQUEST_MEMO.rows[sheetName] = JSON.parse(cached);
      return REQUEST_MEMO.rows[sheetName];
    } catch (_) {
      // Caché dañada: se vuelve a leer la hoja.
    }
  }

  const rows = readSheetObjects(sheetName);
  REQUEST_MEMO.rows[sheetName] = rows;

  const json = JSON.stringify(rows);
  // CacheService admite hasta 100 KB por valor.
  if (json.length < 90000) {
    cache.put(SHEET_CACHE_PREFIX + sheetName, json, SHEET_CACHE_SECONDS);
  }

  return rows;
}

// Se llama después de escribir en una pestaña desde la app.
function invalidateSheet(sheetName) {
  delete REQUEST_MEMO.rows[sheetName];
  CacheService.getScriptCache().remove(SHEET_CACHE_PREFIX + sheetName);
}

function sheetExists(sheetName) {
  return !!getSpreadsheet().getSheetByName(sheetName);
}

function readSheetObjects(sheetName) {
  const sheet = getSheet(sheetName);
  const values = sheet.getDataRange().getDisplayValues();

  if (!values || values.length < 2) {
    return [];
  }

  const headers = values[0].map(h => String(h || '').trim());

  return values.slice(1)
    .filter(row => row.some(cell => String(cell || '').trim() !== ''))
    .map(row => {
      const obj = {};
      headers.forEach((header, i) => {
        if (header) obj[header] = row[i] !== undefined ? row[i] : '';
      });
      return obj;
    });
}

// Crea la pestaña si no existe y pone los encabezados si está vacía.
function ensureSheetWithHeaders(sheetName, headers) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  const lastCol = Math.max(sheet.getLastColumn(), headers.length);
  const existing = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];

  if (existing.every(v => String(v || '').trim() === '')) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    invalidateSheet(sheetName);
  }

  return sheet;
}

// Añade al final las columnas que falten. Devuelve { nombre: nº de columna (1..n) }.
function ensureColumns(sheet, names) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0]
    .map(v => String(v || '').trim());

  names.forEach(name => {
    if (headers.indexOf(name) === -1) {
      headers.push(name);
      sheet.getRange(1, headers.length).setValue(name);
      invalidateSheet(sheet.getName());
    }
  });

  const map = {};
  headers.forEach((name, i) => {
    if (name) map[name] = i + 1;
  });
  return map;
}

function updateLastAccess(usuario) {
  const sheet = getSheet(SHEETS.USUARIOS);
  const values = sheet.getDataRange().getValues();

  if (!values.length) return;

  const headers = values[0].map(v => String(v || '').trim());
  const userCol = headers.indexOf('Usuario');
  const accessCol = headers.indexOf('Último acceso');

  if (userCol === -1 || accessCol === -1) return;

  const target = normalizeText(usuario);

  for (let r = 1; r < values.length; r++) {
    if (normalizeText(values[r][userCol]) === target) {
      sheet.getRange(r + 1, accessCol + 1).setValue(new Date());
      invalidateSheet(SHEETS.USUARIOS);
      return;
    }
  }
}


/* =========================================================
   UTILIDADES GENERALES
   ========================================================= */

function parseFlexibleDate(value) {
  if (!value) return null;

  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return new Date(value.getTime());
  }

  const text = String(value).trim();
  if (!text) return null;

  // yyyy-mm-dd
  let match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  // dd/mm/yyyy o dd-mm-yyyy
  match = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (match) {
    return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  }

  const date = new Date(text);
  return isNaN(date) ? null : date;
}

// Fecha en formato 2026-10-10, o '' si no se entiende.
function isoDate(value) {
  const date = parseFlexibleDate(value);
  if (!date) return '';
  return date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0');
}

function httpUrl(value) {
  const url = String(value || '').trim();
  return /^https?:\/\//i.test(url) ? url : '';
}

function parsePostData(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return {};
  }

  const raw = String(e.postData.contents || '').trim();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch (error) {
    // Compatibilidad básica con formularios URL-encoded.
    const result = {};
    raw.split('&').forEach(pair => {
      const parts = pair.split('=');
      const key = decodeURIComponent(parts[0] || '');
      const value = decodeURIComponent((parts.slice(1).join('=') || '').replace(/\+/g, ' '));
      if (key) result[key] = value;
    });
    return result;
  }
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');
}

function cleanError(error) {
  if (!error) return 'Error desconocido.';
  return String(error.message || error).replace(/^Error:\s*/i, '');
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
