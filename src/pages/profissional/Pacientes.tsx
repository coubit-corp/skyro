import { useAuth } from '../../auth/auth-context'
import { SignOutButton } from '../../components/SignOutButton'
import { Placeholder } from '../Placeholder'

export function Pacientes() {
  const { profile } = useAuth()
  return (
    <Placeholder
      title="Seus pacientes"
      subtitle={`${profile?.full_name ?? ''} · quem precisa de atenção hoje aparece primeiro.`}
    >
      <SignOutButton />
    </Placeholder>
  )
}
