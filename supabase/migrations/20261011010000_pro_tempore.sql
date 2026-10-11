-- Pro tempore: un puesto se puede cubrir con un hermano o con alguien de fuera escrito a mano (invitado).
alter table puestos_tenida alter column miembro_id drop not null;
alter table puestos_tenida add column if not exists invitado text not null default '';
alter table puestos_tenida drop constraint if exists puestos_tenida_quien;
alter table puestos_tenida add constraint puestos_tenida_quien
  check ((miembro_id is not null) <> (invitado <> '') and char_length(invitado) <= 120);

notify pgrst, 'reload schema';
