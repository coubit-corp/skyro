import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/auth-context'
import { FullScreenLoader } from '../../components/FullScreenLoader'
import { Logo } from '../../components/Logo'
import { ProfessionalForm } from '../../components/ProfessionalForm'
import { SignOutButton } from '../../components/SignOutButton'
import { ErrorState } from '../../components/ui'
import { useMyProfessional, useSaveProfessional } from '../../hooks/useProData'
import { initialValues, toProfessionalRow } from '../../lib/professionalForm'

/** Primeira tela de quem cria conta como profissional: sem perfil completo, não entra no painel. */
export function CompletarPerfil() {
  const { profile, refreshProfile } = useAuth()
  const me = useMyProfessional()
  const save = useSaveProfessional()
  // Marcado ANTES de salvar: quando o perfil passa a existir, esta tela redireciona
  // uma única vez, para "Meu perfil" com o aviso de publicado (sem corrida de navegação).
  const [publishing, setPublishing] = useState(false)

  if (me.isLoading) return <FullScreenLoader />
  if (me.error) return <ErrorState message={me.error.message} onRetry={() => me.refetch()} />
  if (me.data) {
    return publishing ? <Navigate to="/pro/perfil" replace state={{ justCreated: true }} /> : <Navigate to="/pro" replace />
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <Logo />
        <SignOutButton />
      </header>
      <h1 className="text-[28px] font-bold">Complete seu perfil</h1>
      <p className="mt-1 mb-5 text-sm text-muted">
        É assim que os pacientes encontram você no “Perto de você”. Leva uns 2 minutos e dá para mudar depois.
      </p>
      <ProfessionalForm
        initial={initialValues(profile?.full_name ?? '', null)}
        submitLabel="Publicar meu perfil"
        saving={save.isPending}
        saveError={save.error?.message}
        onSubmit={async (v) => {
          setPublishing(true)
          try {
            await save.mutateAsync({ fullName: v.fullName, row: toProfessionalRow(v), exists: false })
            await refreshProfile()
          } catch {
            setPublishing(false) // o erro aparece no formulário
          }
        }}
      />
    </div>
  )
}
