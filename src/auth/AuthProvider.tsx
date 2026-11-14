import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Profile } from '../lib/database.types'
import { supabase } from '../lib/supabase'
import { AuthContext, type AuthState } from './auth-context'

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) {
    console.error('Erro ao carregar o perfil:', error.message)
    return null
  }
  return data as Profile | null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const queryClient = useQueryClient()

  useEffect(() => {
    let active = true

    // Carrega o perfil sempre que a sessão mudar (login, logout, refresh do token).
    const apply = async (next: Session | null) => {
      const nextProfile = next ? await fetchProfile(next.user.id) : null
      if (!active) return
      setSession(next)
      setProfile(nextProfile)
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data }) => apply(data.session))

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      // Não chamar o Supabase direto dentro do callback (pode travar); adia para o próximo tick.
      if (event === 'INITIAL_SESSION') return
      setTimeout(() => apply(next), 0)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    // Apaga os dados em cache para a próxima conta não ver nada da anterior.
    queryClient.clear()
  }, [queryClient])

  const refreshProfile = useCallback(async () => {
    if (session) setProfile(await fetchProfile(session.user.id))
  }, [session])

  const value = useMemo<AuthState>(
    () => ({ session, profile, loading, signOut, refreshProfile }),
    [session, profile, loading, signOut, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
