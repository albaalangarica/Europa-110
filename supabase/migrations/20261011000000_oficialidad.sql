-- Oficialidad: los puestos que tienen que quedar cubiertos en cada tenida, en su orden.
-- Cada puesto tiene un titular; para una tenida concreta se puede poner a otro hermano.

create table if not exists puestos (
  id text primary key,
  nombre text not null,
  orden int not null,
  titular_id uuid references miembros (id) on delete set null
);

create table if not exists puestos_tenida (
  tenida_id text not null references tenidas (id) on update cascade on delete cascade,
  puesto_id text not null references puestos (id) on delete cascade,
  miembro_id uuid not null references miembros (id) on delete cascade,
  primary key (tenida_id, puesto_id)
);

alter table puestos enable row level security;
alter table puestos_tenida enable row level security;
revoke all on puestos, puestos_tenida from anon, authenticated;

-- Titulares actuales. Solo se rellenan si el puesto no existe todavía (no pisa cambios hechos en la app).
insert into puestos (id, nombre, orden, titular_id)
select p.id, p.nombre, p.orden, (select m.id from miembros m where lower(m.usuario) = lower(p.usuario))
from (values
  ('venerable', 'Venerable Maestro', 1, 'Fernando'),
  ('primer-vigilante', 'Primer Vigilante', 2, 'Jesús'),
  ('segundo-vigilante', 'Segundo Vigilante', 3, 'Álvaro'),
  ('orador', 'Orador', 4, 'Javier'),
  ('secretario', 'Secretario', 5, 'Manu'),
  ('guardasellos', 'Guardasellos', 6, 'Manu'),
  ('tesorero', 'Tesorera', 7, 'Maria Luisa'),
  ('experto', 'Experto', 8, 'Eric'),
  ('maestro-ceremonias', 'Maestra de Ceremonias', 9, 'Alba'),
  ('armonia', 'Armonía', 10, 'Álvaro')
) as p (id, nombre, orden, usuario)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
