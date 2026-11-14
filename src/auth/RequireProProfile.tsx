import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { FullScreenLoader } from '../components/FullScreenLoader'
import { ErrorState } from '../components/ui'
import { useMyProfessional } from '../hooks/useProData'

/** Profissional sem perfil completo vai para "Complete seu perfil" antes de usar o painel. */
export function RequireProProfile({ children }: { children: ReactNode }) {
  const me = useMyProfessional()
  if (me.isLoading) return <FullScreenLoader />
  if (me.error) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <ErrorState message={me.error.message} onRetry={() => me.refetch()} />
      </div>
    )
  }
  if (!me.data) return <Navigate to="/pro/completar-perfil" replace />
  return <>{children}</>
}
