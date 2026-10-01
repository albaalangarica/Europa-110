/*
  PREPARAR HOJAS · se ejecuta UNA vez desde el editor de Apps Script.

  1. Selecciona la función prepararHojas en la barra superior.
  2. Pulsa Ejecutar.
  3. Revisa el registro de ejecución: indica qué ha cambiado y si queda algo por hacer a mano.

  Solo añade columnas y pestañas que falten y rellena celdas vacías.
  Nunca borra ni sobrescribe datos. Se puede ejecutar más de una vez sin problema.
*/

// Datos que antes estaban escritos dentro de la web.

const PREP_CARGOS = {
  'manu': 'Secretario',
  'fernando': 'Venerable Maestro',
  'jesus': 'Primer Vigilante',
  'alvaro': 'Segundo Vigilante',
  'martin': 'Apoyo formación Compañeros',
  'alba': 'Tronco de la Viuda'
};

// Tenidas que se mostraban en el calendario de invitados.
const PREP_FECHAS_PUBLICAS = [
  '2026-09-12', '2026-10-10', '2026-11-14', '2026-12-19', '2027-01-09',
  '2027-02-13', '2027-03-13', '2027-04-10', '2027-05-08', '2027-06-19'
];

const PREP_TENIDA_INSTALACION = {
  fecha: '2026-09-12',
  titulo: 'Tenida de Instalación',
  numero: '022',
  presencia: '16:00',
  hora: '17:00',
  lugar: 'Oriente de Vitoria-Gasteiz',
  orden: [
    'Apertura de los Trabajos en A.•. según el R.·. F.·. dR.·.: reconocimiento masónico, recuerdo de los Principios Capitales de la G.·. L.·. S.·. E.·. y apertura propiamente dicha.',
    'Lectura del acta de los anteriores Trabajos y de correspondencia: llamada nominal, adopción del trazado de los últimos Trabajos y lectura de la correspondencia.',
    'Introducción de visitantes y dignatarios de la Orden.',
    'Instalación del V.·. M.·. electo, Q.·. H.·. Fernando, por el V.·. M.·. saliente, Q.·. H.·. Jesús Campo.',
    'Instalación del Colegio de Oficiales de la R.·. L.·. Europa para el curso masónico 6026–6027 por el V.·. M.·. instalado.',
    'Información sobre la traducción literal al español del Ritual del G.·. O.·. D.·. F.·. 6018 y su presentación al GCGDE a finales de septiembre de 6026.',
    'Breve informe de tesorería por el Q.·. H.·. Tesorero Manu Carretero. El resto de OO.·. presentará sus informes en la tenida del 10 de octubre.',
    'Informe de la llamada a puertas de los profanos Santiago C. y Pablo Alfonso B. y votación, si procede, para continuar con el proceso de aplomaciones.',
    'Lectura de planchas e instrucción de grado.',
    'Cadena de Unión.',
    'Circulación del Tronco de la Viuda y del Saco de Proposiciones.',
    'Cierre de los Trabajos según el R.·. F.·. dR.·.'
  ]
};

const PREP_PLANCHAS_PUBLICAS = [
  { titulo: 'La Piedra Rechazada', autor: 'Raquel', url: 'https://drive.google.com/file/d/1vFwsZv3KmmvTmlI7CN4Ff3sjtXqi32zN/view' },
  { titulo: 'La Libertad contra la Realidad', autor: 'Eric', url: 'https://drive.google.com/file/d/1KD-0ZnF9ggoNFWZRuCDjJOjcvMTj5v9s/view' }
];

const PREP_OTRAS_LOGIAS_HEADERS = [
  'ID', 'Fecha', 'Hora', 'Presencia', 'Título', 'Logia', 'Lugar', 'Grado',
  'Tipo', 'Información', 'Observaciones', 'Grado mínimo'
];

const PREP_OTRAS_LOGIAS = [
  {
    ID: 'EXT-2026-09-14-ATOCHA', Fecha: '2026-09-14', Hora: '20:00', Presencia: '',
    'Título': 'Atocha-Plutarco · Tenida Magna de Instalación',
    Logia: 'R.·.L.·. Atocha-Plutarco', Lugar: 'Madrid', Grado: 'A.·.',
    Tipo: 'Tenida Magna de Instalación del Cuadro de Oficiales.',
    'Información': 'Reanudación de los trabajos tras la pausa estival, instalación del nuevo V.·.M.·. y del nuevo Cuadro de Oficiales, lectura de plancha, palabra en bien general, cadena de unión, saco de proposiciones y Tronco de la Viuda.',
    Observaciones: 'Habrá ágape fraternal después de la tenida. Se solicita confirmación de asistencia al ágape con al menos 24 horas de antelación.'
  },
  {
    ID: 'EXT-2026-09-18-XAVIER', Fecha: '2026-09-18', Hora: '19:30', Presencia: '19:00',
    'Título': 'Xavier Mina nº 79 · Tenida Ordinaria',
    Logia: 'R.·.L.·. Xavier Mina nº 79', Lugar: 'Pamplona / Iruña', Grado: 'A.·.',
    Tipo: 'Tenida Ordinaria en grado de A.·.',
    'Información': 'Reanudación de los trabajos, asuntos de Secretaría, convocatoria de elecciones a S.·.G.·.M.·. de la GLSE, asuntos de familia, lectura de informes de aplomación y votación sobre la continuación de un proceso, trabajos de arquitectura, bien general, Tronco de la Viuda y saco de proposiciones.',
    Observaciones: 'Libro de presencia a las 19:00. Comienzo de los trabajos a las 19:30.'
  },
  {
    ID: 'EXT-2026-09-20-LIBREPENSAMIENTO', Fecha: '2026-09-20', Hora: '11:00', Presencia: '10:30',
    'Título': 'Librepensamiento nº 90 · Elecciones e Instalación',
    Logia: 'R.·.L.·. Librepensamiento nº 90', Lugar: 'Zaragoza', Grado: 'A.·.',
    Tipo: 'Tenida Magna de Elecciones e Instalación.',
    'Información': 'Presentación de candidaturas a V.·.M.·. y votación, elección de Vigilantes y del resto del Cuadro de Oficiales, instalación de las Tres Luces y del Cuadro de Oficiales electo, concesión de la joya a la V.·.M.·. saliente, posibles planchas, bien general, Tronco de la Viuda y cadena de unión.',
    Observaciones: 'Montaje y apertura a las 10:30. Trabajos a las 11:00. Ágape fraternal posterior.'
  },
  {
    ID: 'EXT-2026-09-24-DONOSTIA', Fecha: '2026-09-24', Hora: '19:00', Presencia: '',
    'Título': '25 años de Masonería donostiarra',
    Logia: 'Logia Altuna nº 52', Lugar: 'C/ San Jerónimo 18 - Donostia', Grado: '',
    Tipo: 'Conferencia pública',
    'Información': '25 años de Masonería donostiarra.',
    Observaciones: ''
  }
];


function prepararHojas() {
  const log = [];
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  prepararUsuarios(ss, log);
  const instalacionId = prepararAgenda(ss, log);
  prepararPlanchas(ss, log, instalacionId);
  prepararOtrasLogias(ss, log);

  ensureTroncoSheet();
  ensureFormationSheet();
  ensureAttendanceSheet();
  ensureInvitadosSheet();
  log.push('Pestañas Tronco de la Viuda, Formación, Asistencia e Invitados comprobadas.');

  Logger.log(log.join('\n'));
  return log;
}

function prepararUsuarios(ss, log) {
  const sheet = ss.getSheetByName(SHEETS.USUARIOS);
  const cols = ensureColumns(sheet, ['Cargos']);
  const values = sheet.getDataRange().getValues();

  for (let r = 1; r < values.length; r++) {
    const usuario = normalizeText(values[r][cols.Usuario - 1]);
    const cargo = PREP_CARGOS[usuario];
    if (cargo && !String(values[r][cols.Cargos - 1] || '').trim()) {
      sheet.getRange(r + 1, cols.Cargos).setValue(cargo);
      log.push('Usuarios: ' + usuario + ' → ' + cargo);
    }
  }
}

// Devuelve el ID de la tenida de instalación, para enlazar sus planchas.
function prepararAgenda(ss, log) {
  const sheet = ss.getSheetByName(SHEETS.AGENDA);
  const cols = ensureColumns(sheet, [
    'Nº tenida', 'Libro de presencia', 'Orden del día',
    'Convocatoria', 'Convocatoria invitados', 'Público'
  ]);
  const values = sheet.getDataRange().getDisplayValues();
  let instalacionId = '';

  const setIfEmpty = (row, name, value, asText) => {
    if (!cols[name] || String(values[row][cols[name] - 1] || '').trim()) return false;
    const cell = sheet.getRange(row + 1, cols[name]);
    if (asText) cell.setNumberFormat('@');
    cell.setValue(value);
    return true;
  };

  for (let r = 1; r < values.length; r++) {
    const fecha = isoDate(values[r][cols.Fecha - 1]);
    if (!fecha) continue;

    const titulo = normalizeText(values[r][(cols['Título'] || 0) - 1]);
    if (titulo.indexOf('25 anos de masoneria donostiarra') !== -1) {
      log.push('Agenda: la fila "25 años de Masonería donostiarra" ya está en "Otras logias". ' +
        'Bórrala de Agenda para que no salga dos veces.');
    }

    setIfEmpty(r, 'Público', PREP_FECHAS_PUBLICAS.indexOf(fecha) !== -1 ? 'Sí' : 'No');

    if (fecha === PREP_TENIDA_INSTALACION.fecha) {
      const t = PREP_TENIDA_INSTALACION;
      instalacionId = cols.ID ? String(values[r][cols.ID - 1] || '').trim() : '';
      setIfEmpty(r, 'Título', t.titulo);
      setIfEmpty(r, 'Hora', t.hora, true);
      setIfEmpty(r, 'Lugar', t.lugar);
      setIfEmpty(r, 'Nº tenida', t.numero, true);
      setIfEmpty(r, 'Libro de presencia', t.presencia, true);
      if (setIfEmpty(r, 'Orden del día', t.orden.join('\n'))) {
        log.push('Agenda: orden del día de la Tenida de Instalación copiado.');
      }
    }
  }

  log.push('Agenda: columnas comprobadas y "Público" rellenado donde estaba vacío.');
  return instalacionId;
}

function prepararPlanchas(ss, log, instalacionId) {
  const sheet = ss.getSheetByName(SHEETS.PLANCHAS);
  const cols = ensureColumns(sheet, ['Tenida ID', 'Pública']);
  const values = sheet.getDataRange().getDisplayValues();

  PREP_PLANCHAS_PUBLICAS.forEach(plancha => {
    let row = -1;
    for (let r = 1; r < values.length; r++) {
      if (cols['Título'] && normalizeText(values[r][cols['Título'] - 1]) === normalizeText(plancha.titulo)) {
        row = r + 1;
        break;
      }
    }

    if (row === -1) {
      row = sheet.getLastRow() + 1;
      const initial = {
        'Título': plancha.titulo,
        'Autor': plancha.autor,
        'Enlace / archivo': plancha.url,
        'Grado mínimo': 'Aprendiz'
      };
      Object.keys(initial).forEach(name => {
        if (cols[name]) sheet.getRange(row, cols[name]).setValue(initial[name]);
      });
      log.push('Planchas: añadida "' + plancha.titulo + '".');
    }

    const idCell = sheet.getRange(row, cols['Tenida ID']);
    if (instalacionId && !String(idCell.getDisplayValue()).trim()) idCell.setValue(instalacionId);

    const publicCell = sheet.getRange(row, cols['Pública']);
    if (!String(publicCell.getDisplayValue()).trim()) publicCell.setValue('Sí');
  });

  if (!instalacionId) {
    log.push('Planchas: no se encontró la Tenida de Instalación en Agenda (o no tiene ID); ' +
      'rellena a mano "Tenida ID" en sus planchas.');
  }

  log.push('Planchas: recuerda poner el "Tenida ID" de las planchas ya leídas; ' +
    'las que no lo tengan salen como "sin leer" en Secretaría.');
}

function prepararOtrasLogias(ss, log) {
  const existed = !!ss.getSheetByName(SHEETS.OTRAS_LOGIAS);
  const sheet = ensureSheetWithHeaders(SHEETS.OTRAS_LOGIAS, PREP_OTRAS_LOGIAS_HEADERS);

  if (existed && sheet.getLastRow() > 1) {
    log.push('Otras logias: ya tenía datos, no se ha tocado.');
    return;
  }

  const rows = PREP_OTRAS_LOGIAS.map(event => PREP_OTRAS_LOGIAS_HEADERS.map(name => {
    if (name === 'Fecha') {
      const parts = event.Fecha.split('-').map(Number);
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    if (name === 'Grado mínimo') return 'Aprendiz';
    return event[name] || '';
  }));

  const range = sheet.getRange(2, 1, rows.length, PREP_OTRAS_LOGIAS_HEADERS.length);
  // Horas como texto, para que la hoja no las convierta.
  sheet.getRange(2, 3, rows.length, 2).setNumberFormat('@');
  range.setValues(rows);

  log.push('Otras logias: creada con ' + rows.length + ' convocatorias.');
}
