-- Europa 110 · esquema inicial.
--
-- Traslada a tablas las pestañas del Google Sheet "R.·. L.·. EUROPA 110 · Fuente App".
-- Todas las tablas tienen RLS activado y NINGUNA política: con la clave pública no se
-- puede leer ni escribir nada. Solo el servidor de la app (clave service role) accede,
-- y lo hace después de comprobar la sesión y aplicar los mismos permisos que Code.gs.

create type grado as enum ('aprendiz', 'companero', 'maestro');

-- Usuarios ---------------------------------------------------------------

create table miembros (
  id uuid primary key references auth.users (id) on delete cascade,
  usuario text not null,
  nombre text not null default '',
  grado grado not null default 'aprendiz',
  rol text not null default 'Miembro',
  -- Uno o varios cargos separados por comas, como en la columna "Cargos" del Sheet.
  cargos text not null default '',
  activo boolean not null default true,
  observaciones text not null default '',
  ultimo_acceso timestamptz,
  created_at timestamptz not null default now()
);

create unique index miembros_usuario_key on miembros (lower(usuario));

-- Agenda -----------------------------------------------------------------

create table tenidas (
  id text primary key,
  fecha date not null,
  hora text not null default '',
  titulo text not null default '',
  tipo text not null default '',
  lugar text not null default '',
  descripcion text not null default '',
  estado text not null default '',
  grado_minimo grado not null default 'aprendiz',
  visible_para text not null default 'Todos',
  enlace text not null default '',
  observaciones text not null default '',
  numero text not null default '',
  libro_presencia text not null default '',
  orden_del_dia text not null default '',
  convocatoria text not null default '',
  convocatoria_invitados text not null default '',
  publica boolean not null default false,
  updated_at timestamptz not null default now()
);

create index tenidas_fecha_idx on tenidas (fecha);

create table otras_logias (
  id text primary key,
  fecha date not null,
  hora text not null default '',
  presencia text not null default '',
  titulo text not null default '',
  logia text not null default '',
  lugar text not null default '',
  grado text not null default '',
  tipo text not null default '',
  informacion text not null default '',
  observaciones text not null default '',
  grado_minimo grado not null default 'aprendiz',
  visible_para text not null default 'Todos',
  updated_at timestamptz not null default now()
);

-- Biblioteca -------------------------------------------------------------

create table planchas (
  id text primary key,
  titulo text not null default '',
  autor text not null default '',
  grado text not null default '',
  fecha date,
  curso text not null default '',
  tema text not null default '',
  resumen text not null default '',
  enlace text not null default '',
  estado text not null default '',
  grado_minimo grado not null default 'aprendiz',
  visible_para text not null default 'Todos',
  observaciones text not null default '',
  -- Tenida en la que se lee. Sin tenida, sale como "sin leer" en Secretaría.
  tenida_id text references tenidas (id) on update cascade on delete set null,
  publica boolean not null default false,
  updated_at timestamptz not null default now()
);

create index planchas_tenida_idx on planchas (tenida_id);

create table documentos (
  id text primary key,
  titulo text not null default '',
  categoria text not null default '',
  fecha date,
  descripcion text not null default '',
  enlace text not null default '',
  estado text not null default '',
  grado_minimo grado not null default 'aprendiz',
  visible_para text not null default 'Todos',
  observaciones text not null default '',
  updated_at timestamptz not null default now()
);

-- Lo que rellena la app ----------------------------------------------------

create table asistencia (
  tenida_id text not null references tenidas (id) on update cascade on delete cascade,
  miembro_id uuid not null references miembros (id) on delete cascade,
  respuesta text not null check (respuesta in ('Sí', 'No')),
  respondido_at timestamptz not null default now(),
  primary key (tenida_id, miembro_id)
);

create table tronco (
  tenida_id text primary key references tenidas (id) on update cascade on delete cascade,
  importe numeric(10, 2) not null check (importe >= 0),
  registrado_por text not null default '',
  registrado_at timestamptz not null default now(),
  observaciones text not null default '',
  updated_at timestamptz not null default now()
);

create table formaciones (
  id text primary key default 'FORM-' || gen_random_uuid(),
  nivel text not null check (nivel in ('Compañero', 'Aprendiz')),
  titulo text not null,
  fecha date,
  nota text not null default '',
  -- En el orden en que se publicaron.
  enlaces text[] not null default '{}',
  publicado_por text not null default '',
  publicado_at timestamptz not null default now(),
  activo boolean not null default true
);

create table invitados (
  id bigint generated always as identity primary key,
  tenida_id text not null references tenidas (id) on update cascade on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 120),
  logia text not null check (char_length(logia) between 1 and 160),
  estado text not null default 'Apuntado',
  observaciones text not null default '',
  created_at timestamptz not null default now()
);

create unique index invitados_unico on invitados (tenida_id, lower(nombre), lower(logia));

-- Seguridad ----------------------------------------------------------------

alter table miembros enable row level security;
alter table tenidas enable row level security;
alter table otras_logias enable row level security;
alter table planchas enable row level security;
alter table documentos enable row level security;
alter table asistencia enable row level security;
alter table tronco enable row level security;
alter table formaciones enable row level security;
alter table invitados enable row level security;

revoke all on all tables in schema public from anon, authenticated;
