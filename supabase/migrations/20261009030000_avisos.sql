-- Avisos dentro de la app: tenidas (nueva, orden del día, convocatoria), formaciones nuevas
-- y aportaciones. Los de asistencia (se abre la confirmación y recordatorio) no se guardan:
-- la app los calcula a partir de la agenda.

create table if not exists avisos (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('tenida', 'orden', 'convocatoria', 'formacion', 'aportacion')),
  titulo text not null,
  cuerpo text not null default '',
  enlace text not null default '/',
  -- Quién lo ve: como el contenido de origen (grado mínimo y "Visible para")…
  grado_minimo grado not null default 'aprendiz',
  visible_para text not null default 'Todos',
  -- …o, en formaciones y aportaciones, quienes ven ese nivel de formación.
  nivel text check (nivel in ('Compañero', 'Aprendiz')),
  -- Quien lo provoca no recibe su propio aviso.
  autor_id uuid references miembros (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists avisos_created_idx on avisos (created_at desc);

alter table avisos enable row level security;
revoke all on avisos from anon, authenticated;

-- Hasta cuándo ha visto cada persona sus avisos (para el número de la campana).
alter table miembros add column if not exists avisos_vistos_at timestamptz;

notify pgrst, 'reload schema';
