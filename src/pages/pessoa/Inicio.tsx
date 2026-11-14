import { useAuth } from '../../auth/auth-context'
import { SignOutButton } from '../../components/SignOutButton'
import { Placeholder } from '../Placeholder'

export function Inicio() {
  const { profile } = useAuth()
  const firstName = profile?.full_name.split(' ')[0] || 'você'
  return (
    <Placeholder title={`Olá, ${firstName}!`} subtitle="Strike, sono, foco e o checklist de hoje.">
      <SignOutButton />
    </Placeholder>
  )
}
