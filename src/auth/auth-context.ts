import type { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'
import type { Profile } from '../lib/database.types'

export interface AuthState {
  session: Session | null
  profile: Profile | null
  /** true até a sessão (e o perfil, se houver) terminarem de carregar */
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
