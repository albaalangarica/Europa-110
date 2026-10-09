#!/usr/bin/env node
/*
 * Importa a Supabase las pestañas del Google Sheet "R.·. L.·. EUROPA 110 · Fuente App".
 * Se usa una sola vez, al pasar de la app antigua (Apps Script) a la nueva.
 *
 * Uso:
 *   node --env-file=.env.local scripts/importar-sheet.mjs <carpeta>
 *
 * La carpeta contiene un JSON por pestaña, tal y como lo devuelve la API de Sheets
 * ({"values": [[cabeceras], [fila], …]}): Usuarios.json, Agenda.json, Otras logias.json,
 * Planchas.json, Documentos.json, Formación.json, Asistencia.json, Tronco de la Viuda.json,
 * Invitados.json. Las que falten se saltan.
 *
 * Contraseñas: opcionalmente, contrasenas.json con {"Usuario": "contraseña"}. Quien no tenga
 * contraseña recibe una aleatoria y Administración se la pone después desde la app.
 *
 * Se puede repetir: actualiza lo que ya existe y no duplica nada. Nunca borra.
 * Los datos de la logia NO se guardan en el repositorio: la carpeta queda fuera.
 */
import { randomBytes, randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const dir = process.argv[2]
if (!dir) {
  console.error('Indica la carpeta con los JSON del Sheet.')
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

const norm = (v) =>
  String(v ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')

const yes = (v) => norm(v) === 'si'

function sheet(name) {
  const file = join(dir, `${name}.json`)
  if (!existsSync(file)) return []
  const { values = [] } = JSON.parse(readFileSync(file, 'utf8'))
  const [headers = [], ...rows] = values
  return rows
    .filter((row) => row.some((cell) => String(cell ?? '').trim()))
    .map((row) => Object.fromEntries(headers.map((h, i) => [String(h).trim(), String(row[i] ?? '').trim()])))
}

function isoDate(value) {
  const raw = String(value ?? '').trim()
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(raw)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return null
}

// "24/09/2026 13:26:04" (hora de España) → ISO.
function isoDateTime(value) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(String(value ?? '').trim())
  if (!m) return null
  const local = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}T${(m[4] ?? '12').padStart(2, '0')}:${m[5] ?? '00'}:${m[6] ?? '00'}`
  // España: +02:00 en verano, +01:00 en invierno. Basta para fechas de registro.
  const month = Number(m[2])
  return `${local}${month >= 4 && month <= 10 ? '+02:00' : '+01:00'}`
}

function grade(value) {
  const g = norm(value)
  return g === 'aprendiz' || g === 'companero' || g === 'maestro' ? g : null
}

async function upsert(table, rows, onConflict = 'id') {
  if (!rows.length) return
  const { error } = await db.from(table).upsert(rows, { onConflict })
  if (error) throw new Error(`${table}: ${error.message}`)
  console.log(`✓ ${table}: ${rows.length}`)
}

/* Usuarios → cuentas de acceso + miembros */

const passwords = existsSync(join(dir, 'contrasenas.json')) ? JSON.parse(readFileSync(join(dir, 'contrasenas.json'), 'utf8')) : {}
const { data: existing, error: existingError } = await db.from('miembros').select('id, usuario')
if (existingError) throw existingError
const memberIds = new Map(existing.map((m) => [norm(m.usuario), m.id]))

let withPassword = 0
for (const u of sheet('Usuarios')) {
  if (!u.Usuario) continue
  const password = String(passwords[u.Usuario] ?? '').trim()
  let id = memberIds.get(norm(u.Usuario))

  if (!id) {
    const { data, error } = await db.auth.admin.createUser({
      email: `m-${randomUUID()}@miembros.europa110.app`,
      password: password.length >= 6 ? password : randomBytes(18).toString('base64url'),
      email_confirm: true,
    })
    if (error) throw new Error(`cuenta de ${u.Usuario}: ${error.message}`)
    id = data.user.id
    memberIds.set(norm(u.Usuario), id)
  } else if (password.length >= 6) {
    const { error } = await db.auth.admin.updateUserById(id, { password })
    if (error) throw new Error(`contraseña de ${u.Usuario}: ${error.message}`)
  }
  if (password.length >= 6) withPassword++

  const g = grade(u.Grado)
  if (!g) console.warn(`! ${u.Usuario}: grado "${u.Grado}" no válido, se pone Aprendiz`)
  const { error } = await db.from('miembros').upsert({
    id,
    usuario: u.Usuario,
    nombre: u['Nombre mostrado'] || u.Usuario,
    grado: g ?? 'aprendiz',
    rol: u.Rol || 'Miembro',
    cargos: u.Cargos || '',
    activo: yes(u.Activo),
    observaciones: u.Observaciones || '',
    ultimo_acceso: isoDateTime(u['Último acceso']),
  })
  if (error) throw new Error(`miembro ${u.Usuario}: ${error.message}`)
}
console.log(`✓ miembros: ${memberIds.size} (${withPassword} con su contraseña del Sheet)`)

/* Contenido */

const visibility = (r) => ({ grado_minimo: grade(r['Grado mínimo']) ?? 'aprendiz', visible_para: r['Visible para'] || 'Todos' })

await upsert(
  'tenidas',
  sheet('Agenda')
    .filter((r) => r.ID && isoDate(r.Fecha))
    .map((r) => ({
      id: r.ID,
      fecha: isoDate(r.Fecha),
      hora: r.Hora || '',
      titulo: r['Título'] || '',
      tipo: r.Tipo || '',
      lugar: r.Lugar || '',
      descripcion: r['Descripción'] || '',
      estado: r.Estado || '',
      ...visibility(r),
      enlace: r['Enlace / archivo'] || '',
      observaciones: r.Observaciones || '',
      numero: r['Nº tenida'] || '',
      libro_presencia: r['Libro de presencia'] || '',
      orden_del_dia: r['Orden del día'] || '',
      convocatoria: r.Convocatoria || '',
      convocatoria_invitados: r['Convocatoria invitados'] || '',
      publica: yes(r['Público']),
    })),
)

await upsert(
  'otras_logias',
  sheet('Otras logias')
    .map((r, i) => ({ ...r, ID: r.ID || `EXT-${i + 1}` }))
    .filter((r) => isoDate(r.Fecha))
    .map((r) => ({
      id: r.ID,
      fecha: isoDate(r.Fecha),
      hora: r.Hora || '',
      presencia: r.Presencia || '',
      titulo: r['Título'] || '',
      logia: r.Logia || '',
      lugar: r.Lugar || '',
      grado: r.Grado || '',
      tipo: r.Tipo || '',
      informacion: r['Información'] || '',
      observaciones: r.Observaciones || '',
      ...visibility(r),
    })),
)

await upsert(
  'planchas',
  sheet('Planchas')
    .map((r, i) => ({ ...r, ID: r.ID || `PLA-IMP-${i + 1}` }))
    .map((r) => ({
      id: r.ID,
      titulo: r['Título'] || '',
      autor: r.Autor || '',
      grado: r.Grado || '',
      fecha: isoDate(r.Fecha),
      curso: r.Curso || '',
      tema: r.Tema || '',
      resumen: r.Resumen || '',
      enlace: r['Enlace / archivo'] || '',
      estado: r.Estado || '',
      ...visibility(r),
      observaciones: r.Observaciones || '',
      tenida_id: r['Tenida ID'] || null,
      publica: yes(r['Pública']),
    })),
)

await upsert(
  'documentos',
  sheet('Documentos')
    .map((r, i) => ({ ...r, ID: r.ID || `DOC-IMP-${i + 1}` }))
    .map((r) => ({
      id: r.ID,
      titulo: r['Título'] || '',
      categoria: r['Categoría'] || '',
      fecha: isoDate(r.Fecha),
      descripcion: r['Descripción'] || '',
      enlace: r['Enlace / archivo'] || '',
      estado: r.Estado || '',
      ...visibility(r),
      observaciones: r.Observaciones || '',
    })),
)

await upsert(
  'formaciones',
  sheet('Formación')
    .filter((r) => r.ID && r['Título'])
    .map((r) => {
      let enlaces = []
      try {
        enlaces = JSON.parse(r.Enlaces || '[]')
      } catch {
        enlaces = String(r.Enlaces || '').split(/\r?\n/)
      }
      return {
        id: r.ID,
        nivel: norm(r.Nivel) === 'aprendiz' ? 'Aprendiz' : 'Compañero',
        titulo: r['Título'],
        fecha: isoDate(r.Fecha),
        nota: r.Nota || '',
        enlaces: (Array.isArray(enlaces) ? enlaces : []).map((x) => String(x).trim()).filter(Boolean),
        publicado_por: r['Publicado por'] || '',
        publicado_at: isoDateTime(r['Fecha publicación']) ?? new Date().toISOString(),
        activo: !r.Activo || yes(r.Activo),
      }
    }),
)

/* Lo que rellenaba la app */

await upsert(
  'asistencia',
  sheet('Asistencia')
    .map((r) => ({ r, miembro: memberIds.get(norm(r.Usuario)) }))
    .filter(({ r, miembro }) => {
      if (!miembro) console.warn(`! asistencia de "${r.Usuario}" sin miembro: se salta`)
      return miembro && (r.Respuesta === 'Sí' || r.Respuesta === 'No')
    })
    .map(({ r, miembro }) => ({
      tenida_id: r['Tenida ID'],
      miembro_id: miembro,
      respuesta: r.Respuesta,
      respondido_at: isoDateTime(r.Actualizado || r['Fecha respuesta']) ?? new Date().toISOString(),
    })),
  'tenida_id,miembro_id',
)

await upsert(
  'tronco',
  sheet('Tronco de la Viuda')
    .filter((r) => r['Tenida ID'])
    .map((r) => {
      const importe = Number(String(r.Importe).replace(/[€\s]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.'))
      return {
        tenida_id: r['Tenida ID'],
        importe: Number.isFinite(importe) ? importe : 0,
        registrado_por: r['Registrado por'] || '',
        registrado_at: isoDateTime(r['Fecha de registro']) ?? new Date().toISOString(),
        observaciones: r.Observaciones || '',
        updated_at: isoDateTime(r.Actualizado) ?? new Date().toISOString(),
      }
    }),
  'tenida_id',
)

const invitados = sheet('Invitados').filter((r) => r['Tenida ID'] && r.Nombre && r['Logia de procedencia'])
for (const r of invitados) {
  const { error } = await db.from('invitados').insert({
    tenida_id: r['Tenida ID'],
    nombre: r.Nombre,
    logia: r['Logia de procedencia'],
    estado: r.Estado || 'Apuntado',
    observaciones: r.Observaciones || '',
    created_at: isoDateTime(r['Fecha de inscripción']) ?? new Date().toISOString(),
  })
  if (error && error.code !== '23505') throw new Error(`invitados: ${error.message}`)
}
if (invitados.length) console.log(`✓ invitados: ${invitados.length}`)

console.log('Importación terminada.')
