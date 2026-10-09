-- Saco de proposiciones: cualquier miembro deja el enlace (Drive u otro) a una propuesta.
-- Queda provisional hasta que Secretaría, el Venerable o Administración la aprueban.
create table if not exists proposiciones (
  id bigint generated always as identity primary key,
  titulo text not null check (char_length(titulo) between 1 and 200),
  enlace text not null check (enlace ~* '^https?://' and char_length(enlace) <= 2000),
  nota text not null default '' check (char_length(nota) <= 2000),
  miembro_id uuid references miembros (id) on delete set null,
  aprobada boolean not null default false,
  aprobada_por text not null default '',
  aprobada_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists proposiciones_created_idx on proposiciones (created_at desc);

alter table proposiciones enable row level security;
revoke all on proposiciones from anon, authenticated;

notify pgrst, 'reload schema';
