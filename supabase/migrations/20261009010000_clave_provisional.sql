-- Contraseña provisional: mientras esté marcada, la app avisa a la persona para que la cambie en su perfil.
alter table miembros add column if not exists debe_cambiar_clave boolean not null default false;
