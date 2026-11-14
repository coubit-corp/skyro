import { Suspense } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import { Avatar } from './Avatar'
import { BottomNav, type NavItem } from './BottomNav'
import { Logo } from './Logo'
import { SignOutButton } from './SignOutButton'
import { Skeleton } from './ui'

/**
 * Casca das telas logadas: conteúdo centralizado (largura de celular no mobile,
 * mais largo no desktop) + navegação.
 */
export function AppLayout({
  nav,
  wide = false,
  profileTo,
}: {
  nav: NavItem[]
  wide?: boolean
  /** Endereço do "Meu perfil", quando ele não é uma aba do menu (pessoa) */
  profileTo?: string
}) {
  const { profile } = useAuth()
  return (
    <div className="min-h-dvh lg:pl-56">
      <div className="fixed top-0 left-0 z-30 hidden w-56 px-6 pt-8 lg:block">
        <Logo />
      </div>
      <div className="fixed bottom-6 left-3 z-30 hidden w-50 space-y-2 lg:block">
        {profileTo && profile && (
          <Link
            to={profileTo}
            className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold text-ink hover:bg-lavender-soft"
          >
            <Avatar seed={profile.avatar_seed} photo={profile.avatar_path} name={profile.full_name} size={32} />
            <span className="truncate">Meu perfil</span>
          </Link>
        )}
        <div className="px-3">
          <SignOutButton />
        </div>
      </div>
      <main
        className={`mx-auto px-4 pt-6 pb-28 sm:px-6 lg:pt-10 lg:pb-12 ${wide ? 'max-w-5xl' : 'max-w-xl'}`}
      >
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </main>
      <BottomNav items={nav} />
    </div>
  )
}

function PageLoading() {
  return (
    <div className="space-y-4" role="status" aria-label="Carregando">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-32" />
      <Skeleton className="h-48" />
    </div>
  )
}
