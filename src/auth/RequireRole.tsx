import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { FullScreenLoader } from '../components/FullScreenLoader'
import { ProfileMissing } from '../components/ProfileMissing'
import type { Role } from '../lib/database.types'
import { useAuth } from './auth-context'
import { homeFor } from './home'

/** Só deixa passar quem está logado e tem o papel certo; senão redireciona. */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { session, profile, loading } = useAuth()

  if (loading) return <FullScreenLoader />
  if (!session) return <Navigate to="/entrar" replace />
  if (!profile) return <ProfileMissing />
  if (profile.role !== role) return <Navigate to={homeFor(profile.role)} replace />
  return <>{children}</>
}

