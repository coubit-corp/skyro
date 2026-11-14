import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/** true quando o .env está preenchido; sem ele o app mostra um aviso em vez de quebrar. */
export const supabaseConfigured = Boolean(url && key)

export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true },
})

/**
 * Nome e avatar de um profissional, para usar dentro de um select.
 * O "!professionals_id_fkey" diz ao Supabase qual ligação usar: desde a tabela
 * plan_notes, existem dois caminhos entre professionals e profiles, e sem a
 * indicação a consulta falha ("more than one relationship was found").
 */
export const PRO_PROFILE = 'profiles!professionals_id_fkey(full_name, avatar_seed, avatar_path)'

export const AVATAR_BUCKET = 'avatars'

/** Link público da foto de perfil, ou null se a pessoa usa o avatar ilustrado. */
export function avatarUrl(path: string | null | undefined): string | null {
  return path ? supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl : null
}
