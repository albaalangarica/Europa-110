const SPREADSHEET_ID = '1HSVNUcExd0_RrU5zKd83vaIVaNno7glatV6JyjBWKCY';

const SHEETS = {
  USUARIOS: 'Usuarios',
  AGENDA: 'Agenda',
  PLANCHAS: 'Planchas',
  DOCUMENTOS: 'Documentos',
  ASISTENCIA: 'Asistencia',
  INVITADOS: 'Invitados'
};

const SESSION_PREFIX = 'europa110_session_';
const SESSION_TTL_SECONDS = 21600; // 6 horas

const GRADE_RANK = {
  'aprendiz': 1,
  'companero': 2,
  'maestro': 3
};

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || 'status').trim().toLowerCase();
    const token = String((e && e.parameter && e.parameter.token) || '').trim();

    if (action === 'status') {
      return jsonResponse({
        ok: true,
        app: 'Europa 110',
        status: 'online'
      });
    }

    if (action === 'me') {
      const session = requireSession(token);
      return jsonResponse({
        ok: true,
        user: publicUser(session.user)
      });
    }

    if (action === 'agenda') {
      const session = requireSession(token);
      const items = getVisibleRows(SHEETS.AGENDA, session.user);

      // Añadimos, si existe, la respuesta de asistencia del usuario a cada tenida.
      const attendanceMap = getAttendanceMapForUser(session.user.Usuario);

      const enriched = items.map(item => {
        const id = String(item.ID || '').trim();
        return Object.assign({}, item, {
          'Mi asistencia': attendanceMap[id] || ''
        });
      });

      return jsonResponse({
        ok: true,
        items: enriched
      });
    }

    if (action === 'planchas') {
      const session = requireSession(token);
      return jsonResponse({
        ok: true,
        items: getVisibleRows(SHEETS.PLANCHAS, session.user)
      });
    }

    if (action === 'documentos') {
      const session = requireSession(token);
      return jsonResponse({
        ok: true,
        items: getVisibleRows(SHEETS.DOCUMENTOS, session.user)
      });
    }

    if (action === 'attendance') {
      const session = requireSession(token);
      return jsonResponse({
        ok: true,
        items: getAttendanceForUser(session.user.Usuario)
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

  if (!agendaItem) {
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
    fechaTenida: agendaItem.Fecha || data.fechaTenida || '',
    tenida: agendaItem['Título'] || data.tenida || 'Tenida',
    nombre: nombre,
    logia: logia
  });

  return jsonResponse({
    ok: true,
    signup: result
  });
}

function ensureInvitadosSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEETS.INVITADOS);

  const headers = [
    'Tenida ID',
    'Fecha tenida',
    'Tenida',
    'Nombre',
    'Logia de procedencia',
    'Fecha de inscripción',
    'Estado',
    'Observaciones'
  ];

  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.INVITADOS);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return sheet;
  }

  const lastCol = Math.max(sheet.getLastColumn(), headers.length);
  const existing = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
  const isEmpty = existing.every(v => String(v || '').trim() === '');

  if (isEmpty) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }

  return sheet;
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

  return {
    tenidaId: tenidaId,
    nombre: data.nombre,
    logia: data.logia,
    alreadyRegistered: false,
    registrado: now.toISOString()
  };
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

  const allowed = visibleFor
    .split(/[,;|]/)
    .map(v => normalizeText(v))
    .filter(Boolean);

  return allowed.includes(usuario) ||
         allowed.includes(rol) ||
         allowed.includes(grado) ||
         allowed.includes('todos');
}

function gradeRank(value) {
  return GRADE_RANK[normalizeText(value)] || 0;
}

function sheetToObjects(sheetName) {
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

function findAgendaById(id) {
  const rows = sheetToObjects(SHEETS.AGENDA);
  return rows.find(row => String(row.ID || '').trim() === String(id || '').trim()) || null;
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
      return;
    }
  }
}

function ensureAttendanceSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEETS.ASISTENCIA);

  const headers = [
    'Tenida ID',
    'Fecha tenida',
    'Usuario',
    'Nombre',
    'Respuesta',
    'Fecha respuesta',
    'Actualizado'
  ];

  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.ASISTENCIA);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return sheet;
  }

  const lastCol = Math.max(sheet.getLastColumn(), headers.length);
  const existing = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];

  const isEmpty = existing.every(v => String(v || '').trim() === '');
  if (isEmpty) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }

  return sheet;
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

      return {
        tenidaId: targetTenida,
        usuario: data.usuario,
        respuesta: data.respuesta,
        actualizado: now.toISOString()
      };
    }
  }

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

function getAttendanceForUser(usuario) {
  const sheet = ensureAttendanceSheet();
  const values = sheet.getDataRange().getDisplayValues();

  if (values.length < 2) return [];

  const headers = values[0].map(v => String(v || '').trim());
  const userIndex = headers.indexOf('Usuario');

  if (userIndex === -1) return [];

  return values.slice(1)
    .filter(row => normalizeText(row[userIndex]) === normalizeText(usuario))
    .map(row => {
      const obj = {};
      headers.forEach((header, i) => {
        if (header) obj[header] = row[i] || '';
      });
      return obj;
    });
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

function attendanceWindowIsOpen(dateValue) {
  const eventDate = parseFlexibleDate(dateValue);
  if (!eventDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  eventDate.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((eventDate.getTime() - today.getTime()) / 86400000);
  return diffDays >= 0 && diffDays <= 10;
}

function parseFlexibleDate(value) {
  if (!value) return null;

  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return new Date(value.getTime());
  }

  const text = String(value).trim();
  if (!text) return null;

  // yyyy-mm-dd
  let match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  // dd/mm/yyyy o dd-mm-yyyy
  match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (match) {
    return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  }

  const date = new Date(text);
  return isNaN(date) ? null : date;
}

function normalizeAttendanceAnswer(value) {
  const raw = normalizeText(value);

  if (['si', 'sí', 'confirmo', 'asisto', 'confirmado'].includes(raw)) {
    return 'Sí';
  }

  if (['no', 'no asistire', 'no asistiré', 'ausente', 'no asisto'].includes(raw)) {
    return 'No';
  }

  return '';
}

function publicUser(user) {
  return {
    usuario: user.Usuario || '',
    nombre: user['Nombre mostrado'] || user.Usuario || '',
    grado: user.Grado || '',
    rol: user.Rol || ''
  };
}

function getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error('No existe la hoja "' + sheetName + '".');
  }

  return sheet;
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
    .replace(/[\u0300-\u036f]/g, '')
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
