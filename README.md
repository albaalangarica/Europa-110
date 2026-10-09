# R.·. L.·. EUROPA 110 · App privada

Aplicación web (PWA) de la logia: agenda de tenidas, planchas, documentos internos,
paneles de cargo y una zona pública para invitados.

```
Vercel (Next.js: páginas y servidor)  ──►  Supabase (base de datos y cuentas)
```

La web nunca decide qué puede ver alguien: el servidor comprueba la sesión y filtra los datos
con los mismos permisos de siempre antes de enviarlos. Las tablas de Supabase tienen RLS activado
y ninguna política, así que con la clave pública no se puede leer nada.

## Qué hay en la app

| Apartado | Qué permite |
|---|---|
| **Agenda** | Tenidas por meses, con fecha, hora, lugar, tipo y estado de tu asistencia. Cada mes, el desplegable de invitaciones y actos de otras logias. |
| **Ficha de tenida** | Confirmar o excusar asistencia (se abre 10 días antes), Tronco de la Viuda, información, orden del día, planchas y convocatoria. Secretaría y Venerable ven las confirmaciones. |
| **Planchas** | Buscador por título, autor, tema, resumen, curso o grado. |
| **Interno** | Asuntos de familia y documentos. |
| **Paneles de cargo** | Cada persona ve el suyo: Secretaría, Venerable, 1er/2º Vigilante (o "Formación" si apoya sin serlo), Compañero, Aprendiz. Formaciones en pestañas Próximas y Anteriores. |
| **Invitados** | Calendario público, planchas públicas e inscripción con nombre y logia. |
| **Perfil** | Grado y cargos, cambiar contraseña, cerrar sesión. Administración, para el rol Administrador. |
| **Administración** | Tenidas, otras logias, planchas, documentos, formaciones, miembros (con contraseñas) e inscripciones de invitados. Sustituye a editar el Google Sheet. |

### Permisos (iguales que en la app anterior)

La columna **Cargos** de cada miembro admite varios, separados por comas, y también cuenta el **Rol**:

- Secretario → panel de Secretaría; marca la asistencia de cualquiera y registra el Tronco.
- Venerable Maestro → panel del Venerable.
- Primer Vigilante / Apoyo formación Compañeros → publica formación de Compañeros.
- Segundo Vigilante / Apoyo formación Aprendices → publica formación de Aprendices.
- Tronco de la Viuda / Tesorero / Hospitalario / rol Administrador → registra el Tronco.
- Rol Administrador → Administración.
- Compañeros y Aprendices ven las formaciones de su grado.

"Grado mínimo" (Aprendiz, Compañero o Maestro) y "Visible para" (Todos, o usuarios, grados o
cargos separados por comas) funcionan como antes.

## Diseño

Tokens en `src/app/globals.css` (`@theme`): color principal `#0E6974`, profundo `#123C44`,
fondo `#F6F7F5`, tarjetas blancas, selección `#E5F0F0`, texto `#192629` / `#647274`,
tipografía del sistema (SF Pro) con Inter de respaldo, esquinas de 16 px y márgenes de 20 px.
Iconos de [Lucide](https://lucide.dev). Componentes compartidos en `src/components/ui`.

## Puesta en marcha

### 1. Supabase

1. Proyecto en la región West EU (Ireland).
2. SQL Editor → ejecutar `supabase/migrations/20261009000000_esquema.sql`.
3. Importar los datos del Sheet (una sola vez):
   ```bash
   node --env-file=.env.local scripts/importar-sheet.mjs <carpeta-con-los-json>
   ```
   La carpeta tiene un JSON por pestaña (ver el comentario del script). Los datos de la logia
   **no** se suben al repositorio.

### 2. Vercel

1. <https://vercel.com/new> → importar este repositorio (Next.js se detecta solo).
2. Variables de entorno (Settings → Environment Variables), de Supabase → Project Settings → API:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (secreta)
3. Deploy. La región de las funciones es Dublín (`vercel.json`), junto a Supabase.

### 3. El enlace antiguo

`index.html` y `service-worker.js` de la raíz siguen publicándose en GitHub Pages: redirigen a la
app nueva y limpian la versión antigua guardada en los móviles. Si cambia la dirección de Vercel,
se actualiza `NEW_URL` en `index.html`.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # con un Supabase de PRUEBAS
npm run dev
npm run check                # lint + tipos + build
npm run test:e2e             # flujos completos (necesita datos importados y contraseña prueba-1234)
```
