import { Outlet } from 'react-router-dom'
import { BottomNav, type NavItem } from './BottomNav'
import { Logo } from './Logo'
import { SignOutButton } from './SignOutButton'

/**
 * Casca das telas logadas: conteúdo centralizado (largura de celular no mobile,
 * mais largo no desktop) + navegação.
 */
export function AppLayout({ nav, wide = false }: { nav: NavItem[]; wide?: boolean }) {
  return (
    <div className="min-h-dvh lg:pl-56">
      <div className="fixed top-0 left-0 z-30 hidden w-56 px-6 pt-8 lg:block">
        <Logo />
      </div>
      <div className="fixed bottom-6 left-6 z-30 hidden lg:block">
        <SignOutButton />
      </div>
      <main
        className={`mx-auto px-4 pt-6 pb-28 sm:px-6 lg:pt-10 lg:pb-12 ${wide ? 'max-w-5xl' : 'max-w-xl'}`}
      >
        <Outlet />
      </main>
      <BottomNav items={nav} />
    </div>
  )
}
