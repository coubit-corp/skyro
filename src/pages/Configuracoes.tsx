import { Info } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import { DemoBanner } from '../components/DemoBanner'
import { SignOutButton } from '../components/SignOutButton'
import { ThemePicker } from '../components/ThemePicker'
import { ProfileTabs } from '../components/ProfileTabs'
import { PageHeader, Skeleton } from '../components/ui'
import { Perfil } from './pessoa/Perfil'

// O perfil do profissional é grande (mapa, galeria): só carrega para quem é profissional.
const MeuPerfil = lazy(() => import('./profissional/MeuPerfil').then((m) => ({ default: m.MeuPerfil })))
const Galeria = lazy(() => import('./profissional/Galeria').then((m) => ({ default: m.Galeria })))

/**
 * Configurações: perfil, aparência, conta e sair.
 * A pessoa edita o "Meu perfil" aqui mesmo. O profissional também, em duas
 * abas: "Perfil" (dados, formação, redes e avaliações) e "Fotos e vídeos".
 */
export function Configuracoes() {
  const { profile, session } = useAuth()
  const { pathname } = useLocation()
  const isPerson = profile?.role === 'person'
  const isPro = profile?.role === 'professional'
  const onGallery = pathname.replace(/\/+$/, '').endsWith('/galeria')

  return (
    <section className="space-y-6">
      <PageHeader
        title="Configurações"
        subtitle={isPerson || isPro ? 'Seu perfil, a aparência do app e sua conta.' : 'Aparência do app e sua conta.'}
      />

      {isPerson && <Perfil />}

      {isPro && (
        <div className="space-y-4">
          <ProfileTabs />
          <Suspense fallback={<Skeleton className="h-96" />}>{onGallery ? <Galeria /> : <MeuPerfil />}</Suspense>
        </div>
      )}

      <div className="space-y-4">
        <ThemePicker />

        <div className="card space-y-1">
          <h2 className="eyebrow mb-2">Conta</h2>
          {session?.user.email && (
            <p className="text-sm">
              Entrou como <span className="font-semibold">{session.user.email}</span>
            </p>
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
