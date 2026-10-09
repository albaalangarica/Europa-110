import { expect, test, type Page } from '@playwright/test'

/*
 * Recorre los flujos de la app contra un Supabase de pruebas con los datos importados del Sheet
 * (scripts/importar-sheet.mjs) y contraseña "prueba-1234" para todos. Fecha de referencia: octubre de 6026,
 * con la tenida EVT-6026-002 (10/10) dentro de la ventana de confirmación.
 * Si E2E_SHOTS está definido, guarda capturas de cada pantalla en esa carpeta.
 */

const PASSWORD = 'prueba-1234'
// Título único por ejecución, para poder repetir las pruebas sobre la misma base.
const FORMATION = `Simbolismo del nivel ${Date.now().toString(36)}`
const shots = process.env.E2E_SHOTS

async function shot(page: Page, name: string) {
  if (shots) await page.screenshot({ path: `${shots}/${test.info().project.name}-${name}.png`, fullPage: true })
}

async function login(page: Page, usuario: string, password = PASSWORD) {
  await page.goto('/acceso')
  await page.getByLabel('Usuario').selectOption(usuario)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

test.describe.configure({ mode: 'serial' })

test('acceso: contraseña incorrecta y zona privada protegida', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/acceso/)
  await shot(page, '01-acceso')
  await login(page, 'Raquel', 'mala-contraseña')
  await expect(page.getByText('Usuario o contraseña incorrectos.')).toBeVisible()
})

test('aprendiz: agenda, confirmar asistencia, planchas, interno y su panel', async ({ page }) => {
  await login(page, 'Raquel')
  await expect(page.getByRole('heading', { name: 'Agenda', level: 1 })).toBeVisible()
  await expect(page.getByText('Octubre', { exact: true })).toBeVisible()
  await shot(page, '02-agenda')

  // Invitaciones y actos del mes.
  await page.getByText('Invitaciones y actos de Octubre').click()
  await expect(page.getByRole('link', { name: /Hermes-Tolerancia/ })).toBeVisible()
  await shot(page, '03-agenda-invitaciones')
  await page.getByRole('link', { name: /Hermes-Tolerancia/ }).click()
  await expect(page.getByText('R.·.L.·. Hermes-Tolerancia nº 8')).toBeVisible()
  await page.getByRole('button', { name: 'Apuntarme' }).click()
  await expect(page.getByText(/Anotado en este dispositivo/)).toBeVisible()
  await shot(page, '04-otra-logia')
  await page.getByRole('link', { name: 'Volver a Agenda' }).click()

  // Tenida del 10 de octubre: la confirmación está abierta.
  await page.getByRole('link', { name: 'Abrir Tenida Ordinaria' }).first().click()
  await expect(page.getByText('Tenida nº 023')).toBeVisible()
  await expect(page.getByText('Orden del día')).toBeVisible()
  await expect(page.getByRole('link', { name: 'https://maps.app.goo.gl/mSM1XUnRFM4Q6WAz8' })).toBeVisible()
  await page.getByRole('button', { name: 'Confirmo asistencia' }).click()
  await expect(page.getByText('Asistencia confirmada.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirmo asistencia' })).toHaveAttribute('aria-pressed', 'true')
  await shot(page, '05-tenida')
  // Una aprendiz no ve las confirmaciones ni registra el Tronco.
  await expect(page.getByText('Confirmaciones de la tenida')).toHaveCount(0)
  await expect(page.getByLabel('Importe del Tronco de la Viuda')).toHaveCount(0)

  await page.getByRole('link', { name: 'Volver a Agenda' }).click()
  await expect(page.getByText('Asistencia confirmada').first()).toBeVisible()

  // Navegación: Agenda, Planchas, Interno y su panel de Aprendiz.
  const nav = page.getByRole('navigation', { name: 'Navegación principal' })
  await expect(nav.getByRole('link')).toHaveText(['Agenda', 'Planchas', 'Interno', 'Aprendiz'])

  await nav.getByRole('link', { name: 'Planchas' }).click()
  await expect(page.getByText('La piedra rechazada')).toBeVisible()
  await page.getByLabel('Buscar planchas').fill('libertad')
  await expect(page.getByText('La piedra rechazada')).toHaveCount(0)
  await expect(page.getByText('La libertad contra la realidad')).toBeVisible()
  await shot(page, '06-planchas')
  await page.getByLabel('Buscar planchas').fill('zzzz')
  await expect(page.getByText('No se han encontrado planchas')).toBeVisible()

  await nav.getByRole('link', { name: 'Interno' }).click()
  await expect(page.getByText('Sin asuntos publicados')).toBeVisible()
  await expect(page.getByText('No hay documentos visibles')).toBeVisible()
  await shot(page, '07-interno')

  await nav.getByRole('link', { name: 'Aprendiz' }).click()
  await expect(page.getByRole('heading', { name: 'Aprendiz', level: 1 })).toBeVisible()
  await expect(page.getByText('No hay convocatorias de formación')).toBeVisible()
  await shot(page, '08-panel-aprendiz-vacio')

  // Sin permiso, los paneles de otros cargos y Administración no existen.
  await page.goto('/panel/secretaria')
  await expect(page.getByText('No se ha encontrado')).toBeVisible()
  await page.goto('/admin')
  await expect(page.getByText('No se ha encontrado')).toBeVisible()
  await page.goto('/panel/companero')
  await expect(page.getByText('No se ha encontrado')).toBeVisible()
})

test('primer vigilante: publica una formación con enlaces en orden', async ({ page }) => {
  await login(page, 'Jesús')
  const nav = page.getByRole('navigation', { name: 'Navegación principal' })
  await nav.getByRole('link', { name: '1er Vigilante' }).click()
  await expect(page.getByRole('heading', { name: 'Primer Vigilante', level: 1 })).toBeVisible()
  await page.getByRole('button', { name: 'Publicar formación' }).click()
  await page.getByLabel('Título').fill(FORMATION)
  await page.getByLabel('Fecha de la formación').fill('2026-10-22')
  await page.getByLabel('Nota').fill('Primera línea de la nota\nSegunda línea')
  await page.getByLabel('Enlace', { exact: true }).fill('https://example.org/uno')
  await page.getByRole('button', { name: 'Añadir otro enlace' }).click()
  await page.getByLabel('Enlace 2').fill('https://example.org/dos')
  await shot(page, '09-publicar-formacion')
  await page.getByRole('button', { name: 'Publicar formación' }).click()
  await expect(page.getByText('Formación publicada.')).toBeVisible()
  await expect(page.getByRole('link', { name: `Abrir ${FORMATION}` })).toBeVisible()
  await expect(page.getByRole('link', { name: `Abrir ${FORMATION}` }).getByText('2 materiales')).toBeVisible()
})

test('compañero: pestañas Próximas y Anteriores, detalle con materiales', async ({ page }) => {
  await login(page, 'Eric')
  const nav = page.getByRole('navigation', { name: 'Navegación principal' })
  await nav.getByRole('link', { name: 'Compañero' }).click()
  await expect(page.getByRole('link', { name: `Abrir ${FORMATION}` })).toBeVisible()
  await shot(page, '10-companero-proximas')

  await page.getByRole('link', { name: /Anteriores/ }).click()
  await expect(page).toHaveURL(/tab=anteriores/)
  await expect(page.getByRole('link', { name: /Abrir Aprender a Pensar/ })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Abrir Fantasía' })).toBeVisible()
  await shot(page, '11-companero-anteriores')

  await page.getByRole('link', { name: /Abrir Aprender a Pensar/ }).click()
  await expect(page.getByText('Deseo y Consentimiento', { exact: false })).toBeVisible()
  const materials = page.getByRole('link', { name: /Material/ })
  await expect(materials).toHaveCount(2)
  await expect(materials.nth(0)).toHaveAttribute('href', /HjLDUHNt57k/)
  await expect(materials.nth(1)).toHaveAttribute('href', /m9cLQDQ958I/)
  await shot(page, '12-formacion-detalle')
  await page.getByRole('link', { name: 'Volver a Compañero' }).click()
  await expect(page.getByRole('heading', { name: 'Compañero', level: 1 })).toBeVisible()
})

test('secretaría: confirmaciones, marcar asistencia de otro y Tronco', async ({ page }) => {
  await login(page, 'Manu')
  const nav = page.getByRole('navigation', { name: 'Navegación principal' })
  await nav.getByRole('link', { name: 'Secretaría' }).click()
  await expect(page.getByText('Planchas sin leer')).toBeVisible()
  await expect(page.getByText('No hay planchas pendientes de lectura')).toBeVisible()
  const card = page.locator('article', { hasText: 'Instalación' }).first()
  // La tenida pasada tiene el detalle plegado.
  await card.getByText('Nombres, asistencia y Tronco').click()
  await expect(card.getByRole('definition').filter({ hasText: 'Fernando' })).toBeVisible()

  await card.getByText('Marcar asistencia').click()
  await card.getByRole('button', { name: 'Itziar: asiste' }).click()
  await expect(card.getByText('Itziar: asiste.')).toBeVisible()

  await card.getByLabel('Importe del Tronco de la Viuda').fill('20,5')
  await card.getByRole('button', { name: 'Guardar' }).click()
  await expect(card.getByText('Importe guardado.')).toBeVisible()
  await shot(page, '13-secretaria')
  await page.reload()
  await expect(page.locator('li', { hasText: 'Instalación' }).getByText('20,50 €')).toBeVisible()
})

test('venerable: ve el panel de gestión sin marcar asistencia de otros', async ({ page }) => {
  await login(page, 'Fernando')
  const nav = page.getByRole('navigation', { name: 'Navegación principal' })
  await expect(nav.getByRole('link')).toHaveText(['Agenda', 'Planchas', 'Interno', 'Venerable'])
  await nav.getByRole('link', { name: 'Venerable' }).click()
  await expect(page.getByRole('heading', { name: 'Venerable Maestro', level: 1 })).toBeVisible()
  await expect(page.getByText('Confirmaciones a las tenidas')).toBeVisible()
  await expect(page.getByText('Marcar asistencia')).toHaveCount(0)
  await shot(page, '14-venerable')
})

test('invitados: calendario, planchas e inscripción', async ({ page }) => {
  await page.goto('/acceso')
  await page.getByRole('link', { name: 'Continuar como invitado' }).click()
  await expect(page.getByRole('heading', { name: 'Calendario', level: 1 })).toBeVisible()
  await shot(page, '15-invitados')
  await page.getByRole('link', { name: 'Abrir Tenida Ordinaria' }).first().click()
  await page.getByRole('button', { name: 'Apuntarse' }).click()
  await page.getByLabel('Nombre').fill('Visitante de prueba')
  await page.getByLabel('Logia de procedencia').fill('R.·.L.·. Prueba')
  await shot(page, '16-invitados-inscripcion')
  await page.getByRole('button', { name: 'Enviar inscripción' }).click()
  await expect(page.getByText(/Inscripción registrada|Ya estabas inscrito/)).toBeVisible()
  await page.getByRole('navigation', { name: 'Navegación de invitados' }).getByRole('link', { name: 'Planchas' }).click()
  await expect(page.getByText('La piedra rechazada')).toBeVisible()
  // Los invitados no ven el orden del día ni entran en la zona privada.
  await page.goto('/')
  await expect(page).toHaveURL(/\/acceso/)
})

test('administración: crear y editar una tenida, y ver invitados', async ({ page }) => {
  await login(page, 'Alba')
  await page.getByRole('link', { name: 'Perfil' }).click()
  await shot(page, '17-perfil')
  await page.getByRole('link', { name: /Gestionar contenidos/ }).click()
  await shot(page, '18-admin')
  await page.getByRole('link', { name: /Tenidas/ }).click()
  await page.getByRole('link', { name: 'Nueva tenida' }).click()
  await page.getByLabel('Fecha').fill('2027-07-10')
  await page.getByLabel('Título').fill('Tenida de prueba')
  await page.getByLabel('Orden del día').fill('Punto uno\nPunto dos')
  await page.getByRole('button', { name: 'Crear tenida' }).click()
  await expect(page.getByText('Guardado.')).toBeVisible()
  await page.getByLabel('Lugar').fill('Vitoria-Gasteiz')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByText('Cambios guardados.')).toBeVisible()
  await shot(page, '19-admin-tenida')
  await page.getByRole('button', { name: 'Borrar tenida' }).click()
  await page.getByRole('button', { name: 'Borrar', exact: true }).click()
  await expect(page.getByText('Borrado.')).toBeVisible()

  await page.goto('/admin/invitados')
  await expect(page.getByText('Visitante de prueba').first()).toBeVisible()
})

test('perfil: cerrar sesión', async ({ page }) => {
  await login(page, 'Alba')
  await page.getByRole('link', { name: 'Perfil' }).click()
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page).toHaveURL(/\/acceso/)
  await page.goto('/planchas')
  await expect(page).toHaveURL(/\/acceso/)
})
