import { LogOut } from 'lucide-react'
import { useAuth } from '../auth/auth-context'

export function SignOutButton() {
  const { signOut } = useAuth()
  return (
    <button onClick={signOut} className="tap gap-1.5 text-sm font-semibold text-primary">
      <LogOut className="h-4 w-4" aria-hidden="true" /> Sair
    </button>
  )
}
