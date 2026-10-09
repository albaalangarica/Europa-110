-- Contraseñas libres: Supabase Auth exige un mínimo de 6 caracteres, pero la logia quiere que cada
-- uno ponga la que quiera. Solo el servidor de la app (service role) puede llamar a esta función,
-- y lo hace después de comprobar la contraseña actual o de que sea Administración.
create or replace function public.cambiar_clave(miembro uuid, clave text)
returns void
language sql
security definer
set search_path = ''
as $$
  update auth.users
     set encrypted_password = extensions.crypt(clave, extensions.gen_salt('bf')),
         updated_at = now()
   where id = miembro;
$$;

revoke all on function public.cambiar_clave(uuid, text) from public, anon, authenticated;
grant execute on function public.cambiar_clave(uuid, text) to service_role;

notify pgrst, 'reload schema';
