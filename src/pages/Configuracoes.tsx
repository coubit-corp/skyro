import { ChevronRight, Info, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import { DemoBanner } from '../components/DemoBanner'
import { SignOutButton } from '../components/SignOutButton'
import { ThemePicker } from '../components/ThemePicker'
import { PageHeader } from '../components/ui'
import { Perfil } from './pessoa/Perfil'

/**
 * Configurações: aparência, conta e sair, para os três tipos de conta.
 * A pessoa edita o "Meu perfil" aqui mesmo; o profissional tem uma aba própria
 * de perfil (vitrine para os pacientes), então aqui fica só o atalho.
 */
export function Configuracoes() {
  const { profile, session } = useAuth()
  const isPerson = profile?.role === 'person'
  const profilePath = profile?.role === 'professional' ? '/pro/perfil' : undefined

  return (
    <section className="space-y-6">
      <PageHeader
        title="Configurações"
        subtitle={isPerson ? 'Seu perfil, a aparência do app e sua conta.' : 'Aparência do app e sua conta.'}
      />

      {isPerson && <Perfil />}

      <div className="space-y-4">
        <ThemePicker />

        <div className="card space-y-1">
          <h2 className="eyebrow mb-2">Conta</h2>
          {session?.user.email && (
            <p className="text-sm">
              Entrou como <span className="font-semibold">{session.user.email}</span>
            </p>
          )}
          {profilePath && (
            <Link
              to={profilePath}
              className="tap -mx-2 justify-between gap-3 rounded-xl px-2 text-sm font-semibold hover:bg-lavender-soft"
            >
              <span className="flex items-center gap-3 py-1">
                <UserRound className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  Meu perfil
                  <span className="block text-xs font-normal text-muted">Foto, nome, e-mail e telefone</span>
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted" aria-hidden="true" />
            </Link>
          )}
          <div className="pt-1">
            <SignOutButton />
          </div>
        </div>

        <div className="card flex items-start gap-3 text-sm text-muted">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <p>
            Skyro, versão de demonstração do Hack Brasil 2026.
            {profile?.role === 'person' &&
              ' Seus registros só aparecem para os profissionais com quem você compartilha, e você pode parar de compartilhar quando quiser.'}
            {profile?.role === 'professional' &&
              ' Você só vê a rotina de quem compartilhou com você, e perde o acesso na hora em que a pessoa para de compartilhar.'}
          </p>
        </div>
      </div>

      <DemoBanner />
    </section>
  )
}
