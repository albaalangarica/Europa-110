-- Formaciones como panel: hora y lugar (para el calendario) y aportaciones de los hermanos.

alter table formaciones add column if not exists hora text not null default '';
alter table formaciones add column if not exists lugar text not null default '';

-- Reflexiones y enlaces (Drive, vídeos…) que cada uno aporta a una formación.
-- Las ven y las escriben quienes ven esa formación: los de su grado y sus Vigilantes.
create table if not exists aportaciones (
  id bigint generated always as identity primary key,
  formacion_id text not null references formaciones (id) on delete cascade,
  miembro_id uuid not null references miembros (id) on delete cascade,
  texto text not null default '' check (char_length(texto) <= 4000),
  enlace text not null default '' check (char_length(enlace) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (texto <> '' or enlace <> '')
);

create index if not exists aportaciones_formacion_idx on aportaciones (formacion_id, created_at);

alter table aportaciones enable row level security;
revoke all on aportaciones from anon, authenticated;

notify pgrst, 'reload schema';
