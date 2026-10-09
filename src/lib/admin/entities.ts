/*
 * Contenidos que Administración edita desde la app (antes se editaban en el Google Sheet).
 * Cada tipo describe sus campos una sola vez: con esto se pintan la lista y el formulario
 * y se validan los datos en el servidor.
 */

export type FieldType = 'text' | 'textarea' | 'date' | 'url' | 'grade' | 'checkbox' | 'tenida' | 'lines' | 'select'

export interface FieldDef {
  name: string
  label: string
  type: FieldType
  required?: boolean
  hint?: string
  suggestions?: string[]
  options?: string[]
  // Ocupa media fila en pantallas anchas.
  half?: boolean
  defaultValue?: unknown
}

export interface EntityDef {
  key: EntityKey
  table: string
  label: string
  singular: string
  // Género gramatical, para "Nueva tenida" / "Nuevo documento".
  fem: boolean
  // Prefijo de los identificadores nuevos (EVT-2026-AB12…).
  idPrefix?: string
  // El identificador lo escribe Administración (solo al crear).
  manualId?: boolean
  order: { column: string; ascending: boolean }
  title: (row: Record<string, unknown>) => string
  subtitle: (row: Record<string, unknown>) => string
  fields: FieldDef[]
}

export type EntityKey = 'tenidas' | 'convocatorias' | 'planchas' | 'documentos' | 'formaciones'

const GRADE_HINT = 'Quién puede verlo como mínimo'
const VISIBLE_HINT = 'Todos, o usuarios, grados o cargos separados por comas'

const s = (v: unknown) => String(v ?? '')

export const ENTITIES: Record<EntityKey, EntityDef> = {
  tenidas: {
    key: 'tenidas',
    table: 'tenidas',
    label: 'Tenidas',
    singular: 'tenida',
    fem: true,
    idPrefix: 'EVT',
    order: { column: 'fecha', ascending: false },
    title: (r) => s(r.titulo) || 'Tenida',
    subtitle: (r) => [s(r.fecha), s(r.tipo), r.publica ? 'Pública' : ''].filter(Boolean).join(' · '),
    fields: [
      { name: 'fecha', label: 'Fecha', type: 'date', required: true, half: true },
      { name: 'hora', label: 'Hora', type: 'text', hint: 'Por ejemplo 17:00', half: true },
      { name: 'titulo', label: 'Título', type: 'text', suggestions: ['Tenida Ordinaria', 'Instalación', 'Solsticial'] },
      { name: 'tipo', label: 'Tipo', type: 'text', suggestions: ['Apr.·.', 'Comp.·.', 'M.·.', 'Instalación', 'Solsticial', 'Otro'], half: true },
      { name: 'numero', label: 'Nº tenida', type: 'text', half: true },
      { name: 'lugar', label: 'Lugar', type: 'text' },
      { name: 'libro_presencia', label: 'Libro de presencia', type: 'text', hint: 'Hora', half: true },
      { name: 'estado', label: 'Estado', type: 'text', suggestions: ['Provisional', 'Confirmado', 'Cancelado'], half: true },
      { name: 'descripcion', label: 'Descripción', type: 'textarea' },
      { name: 'orden_del_dia', label: 'Orden del día', type: 'textarea', hint: 'Un punto por línea' },
      { name: 'convocatoria', label: 'Convocatoria (miembros)', type: 'url' },
      { name: 'convocatoria_invitados', label: 'Convocatoria para invitados', type: 'url' },
      { name: 'grado_minimo', label: 'Grado mínimo', type: 'grade', hint: GRADE_HINT, half: true },
      { name: 'visible_para', label: 'Visible para', type: 'text', hint: VISIBLE_HINT, half: true },
      { name: 'publica', label: 'Sale en el calendario de invitados', type: 'checkbox', defaultValue: true },
      { name: 'observaciones', label: 'Observaciones internas', type: 'textarea' },
      { name: 'enlace', label: 'Enlace / archivo', type: 'url' },
    ],
  },
  convocatorias: {
    key: 'convocatorias',
    table: 'otras_logias',
    label: 'Otras logias',
    singular: 'convocatoria',
    fem: true,
    idPrefix: 'EXT',
    order: { column: 'fecha', ascending: false },
    title: (r) => s(r.titulo) || 'Convocatoria',
    subtitle: (r) => [s(r.fecha), s(r.logia)].filter(Boolean).join(' · '),
    fields: [
      { name: 'fecha', label: 'Fecha', type: 'date', required: true, half: true },
      { name: 'hora', label: 'Hora', type: 'text', half: true },
      { name: 'titulo', label: 'Título', type: 'text', required: true },
      { name: 'logia', label: 'Logia', type: 'text' },
      { name: 'lugar', label: 'Lugar', type: 'text' },
      { name: 'presencia', label: 'Apertura / presencia', type: 'text', half: true },
      { name: 'grado', label: 'Grado', type: 'text', hint: 'A.·., M.·.…', half: true },
      { name: 'tipo', label: 'Tipo', type: 'text' },
      { name: 'informacion', label: 'Información', type: 'textarea' },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea' },
      { name: 'grado_minimo', label: 'Grado mínimo', type: 'grade', hint: GRADE_HINT, half: true },
      { name: 'visible_para', label: 'Visible para', type: 'text', hint: VISIBLE_HINT, half: true },
    ],
  },
  planchas: {
    key: 'planchas',
    table: 'planchas',
    label: 'Planchas',
    singular: 'plancha',
    fem: true,
    idPrefix: 'PLA',
    order: { column: 'fecha', ascending: false },
    title: (r) => s(r.titulo) || 'Plancha',
    subtitle: (r) => [s(r.autor), s(r.fecha), r.tenida_id ? 'Leída' : 'Sin leer'].filter(Boolean).join(' · '),
    fields: [
      { name: 'titulo', label: 'Título', type: 'text', required: true },
      { name: 'autor', label: 'Autor', type: 'text', half: true },
      { name: 'fecha', label: 'Fecha', type: 'date', half: true },
      { name: 'enlace', label: 'Enlace / archivo', type: 'url', hint: 'Enlace de Drive' },
      { name: 'tenida_id', label: 'Tenida en la que se lee', type: 'tenida', hint: 'Sin tenida, sale como "sin leer" en Secretaría' },
      { name: 'grado', label: 'Grado', type: 'text', half: true },
      { name: 'curso', label: 'Curso', type: 'text', hint: '6026-6027', half: true },
      { name: 'tema', label: 'Tema', type: 'text' },
      { name: 'resumen', label: 'Resumen', type: 'textarea' },
      { name: 'estado', label: 'Estado', type: 'text', suggestions: ['Borrador', 'Publicado'], half: true },
      { name: 'grado_minimo', label: 'Grado mínimo', type: 'grade', hint: GRADE_HINT, half: true },
      { name: 'visible_para', label: 'Visible para', type: 'text', hint: VISIBLE_HINT },
      { name: 'publica', label: 'La pueden ver los invitados', type: 'checkbox' },
      { name: 'observaciones', label: 'Observaciones internas', type: 'textarea' },
    ],
  },
  documentos: {
    key: 'documentos',
    table: 'documentos',
    label: 'Documentos',
    singular: 'documento',
    fem: false,
    idPrefix: 'DOC',
    order: { column: 'fecha', ascending: false },
    title: (r) => s(r.titulo) || 'Documento',
    subtitle: (r) => [s(r.categoria), s(r.fecha)].filter(Boolean).join(' · '),
    fields: [
      { name: 'titulo', label: 'Título', type: 'text', required: true },
      {
        name: 'categoria',
        label: 'Categoría',
        type: 'text',
        suggestions: ['Actas', 'Reglamentos', 'Convocatorias', 'Circulares', 'Rituales', 'Formularios', 'Otros'],
        half: true,
      },
      { name: 'fecha', label: 'Fecha', type: 'date', half: true },
      { name: 'descripcion', label: 'Descripción', type: 'textarea' },
      { name: 'enlace', label: 'Enlace / archivo', type: 'url' },
      { name: 'estado', label: 'Estado', type: 'text', suggestions: ['Borrador', 'Publicado'], half: true },
      { name: 'grado_minimo', label: 'Grado mínimo', type: 'grade', hint: GRADE_HINT, half: true },
      { name: 'visible_para', label: 'Visible para', type: 'text', hint: VISIBLE_HINT },
      { name: 'observaciones', label: 'Observaciones internas', type: 'textarea' },
    ],
  },
  formaciones: {
    key: 'formaciones',
    table: 'formaciones',
    label: 'Formaciones',
    singular: 'formación',
    fem: true,
    idPrefix: 'FORM',
    order: { column: 'publicado_at', ascending: false },
    title: (r) => s(r.titulo) || 'Formación',
    subtitle: (r) => [s(r.nivel), s(r.fecha) || 'Sin fecha', r.activo === false ? 'Retirada' : ''].filter(Boolean).join(' · '),
    fields: [
      { name: 'nivel', label: 'Nivel', type: 'select', options: ['Compañero', 'Aprendiz'], required: true, half: true },
      { name: 'fecha', label: 'Fecha', type: 'date', half: true },
      { name: 'titulo', label: 'Título', type: 'text', required: true },
      { name: 'hora', label: 'Hora', type: 'text', hint: 'Por ejemplo 19:30', half: true },
      { name: 'lugar', label: 'Lugar o enlace de conexión', type: 'text', half: true },
      { name: 'nota', label: 'Nota', type: 'textarea' },
      { name: 'enlaces', label: 'Enlaces', type: 'lines', hint: 'Uno por línea, en orden' },
      { name: 'publicado_por', label: 'Publicado por', type: 'text' },
      { name: 'activo', label: 'Visible en los paneles', type: 'checkbox' },
    ],
  },
}

export const ENTITY_KEYS = Object.keys(ENTITIES) as EntityKey[]

export function isEntityKey(value: string): value is EntityKey {
  return (ENTITY_KEYS as string[]).includes(value)
}

// Valores por defecto de un registro nuevo.
export const DEFAULTS: Record<string, unknown> = {
  grado_minimo: 'aprendiz',
  visible_para: 'Todos',
  activo: true,
  publica: false,
}

export function newLabel(def: EntityDef): string {
  return `${def.fem ? 'Nueva' : 'Nuevo'} ${def.singular}`
}
