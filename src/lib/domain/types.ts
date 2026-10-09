export type Grado = 'aprendiz' | 'companero' | 'maestro'

export interface Miembro {
  id: string
  usuario: string
  nombre: string
  grado: Grado
  rol: string
  cargos: string
  activo: boolean
  observaciones: string
  ultimo_acceso: string | null
}

export interface Tenida {
  id: string
  fecha: string
  hora: string
  titulo: string
  tipo: string
  lugar: string
  descripcion: string
  estado: string
  grado_minimo: Grado
  visible_para: string
  enlace: string
  observaciones: string
  numero: string
  libro_presencia: string
  orden_del_dia: string
  convocatoria: string
  convocatoria_invitados: string
  publica: boolean
}

export interface OtraLogia {
  id: string
  fecha: string
  hora: string
  presencia: string
  titulo: string
  logia: string
  lugar: string
  grado: string
  tipo: string
  informacion: string
  observaciones: string
  grado_minimo: Grado
  visible_para: string
}

export interface Plancha {
  id: string
  titulo: string
  autor: string
  grado: string
  fecha: string | null
  curso: string
  tema: string
  resumen: string
  enlace: string
  estado: string
  grado_minimo: Grado
  visible_para: string
  observaciones: string
  tenida_id: string | null
  publica: boolean
}

export interface Documento {
  id: string
  titulo: string
  categoria: string
  fecha: string | null
  descripcion: string
  enlace: string
  estado: string
  grado_minimo: Grado
  visible_para: string
  observaciones: string
}

export type Respuesta = 'Sí' | 'No'

export interface Tronco {
  tenida_id: string
  importe: number
  registrado_por: string
  registrado_at: string
  observaciones: string
}

export interface Formacion {
  id: string
  nivel: 'Compañero' | 'Aprendiz'
  titulo: string
  fecha: string | null
  nota: string
  enlaces: string[]
  publicado_por: string
  publicado_at: string
  activo: boolean
}

export interface Invitado {
  id: number
  tenida_id: string
  nombre: string
  logia: string
  estado: string
  observaciones: string
  created_at: string
}

// Resumen sí / no / pendientes de una tenida, para Secretaría y Venerable.
export interface AttendanceSummary {
  tenidaId: string
  titulo: string
  fecha: string
  si: string[]
  no: string[]
  pendientes: string[]
  personas: { id: string; nombre: string; respuesta: Respuesta | '' }[]
}

export type ActionResult = { ok: true; message: string } | { ok: false; message: string }
