import 'server-only'
import { z } from 'zod'

/*
 * Variables de entorno. Los secretos solo se leen en el servidor y nunca llevan el prefijo NEXT_PUBLIC_.
 */

const publicSchema = z.object({
  url: z.url({ message: 'NEXT_PUBLIC_SUPABASE_URL debe ser una URL' }),
  anonKey: z.string().min(20, 'NEXT_PUBLIC_SUPABASE_ANON_KEY no está configurada'),
})

export function supabasePublicEnv() {
  return publicSchema.parse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })
}

export function supabaseServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key || key.length < 20) throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada')
  return key
}
