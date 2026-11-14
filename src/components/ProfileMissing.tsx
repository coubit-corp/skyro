import { useAuth } from '../auth/auth-context'

/** Sessão válida, mas o perfil não carregou (ex.: migration não aplicada ou erro de rede). */
export function ProfileMissing() {
  const { signOut, refreshProfile } = useAuth()
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 px-4">
      <div className="card space-y-2">
        <h1 className="text-lg font-bold">Não conseguimos carregar sua conta</h1>
        <p className="text-sm text-muted">
          Você está conectado, mas seu perfil não foi encontrado. Tente de novo em instantes.
        </p>
      </div>
      <button className="btn-primary" onClick={refreshProfile}>Tentar de novo</button>
      <button className="btn-outline" onClick={signOut}>Sair</button>
    </div>
  )
}
