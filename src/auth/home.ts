import type { Role } from '../lib/database.types'

/** Tela inicial de cada tipo de conta. */
export function homeFor(role: Role): string {
  if (role === 'admin') return '/equipe'
  return role === 'professional' ? '/pro' : '/inicio'
}
