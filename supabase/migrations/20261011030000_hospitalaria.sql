-- Hospitalaria: entre tenida y tenida contacta con cada miembro de la logia para saber qué tal está.
-- Cada fila es un contacto hecho; la lista de cada periodo (de una tenida a la siguiente) sale de aquí.
create table if not exists contactos_hospitalaria (
  id bigint generated always as identity primary key,
  miembro_id uuid not null references miembros (id) on delete cascade,
  hecho_por uuid references miembros (id) on delete set null,
  fecha timestamptz not null default now(),
  nota text not null default '' check (char_length(nota) <= 1000)
);

create index if not exists contactos_hospitalaria_idx on contactos_hospitalaria (miembro_id, fecha desc);

alter table contactos_hospitalaria enable row level security;
revoke all on contactos_hospitalaria from anon, authenticated;

notify pgrst, 'reload schema';
