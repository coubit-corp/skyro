import type { LucideIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { isNavActive, type NavMatch } from '../lib/nav'

export interface NavItem extends NavMatch {
  label: string
  icon: LucideIcon
  /** Só aparece na barra lateral do desktop (no celular não cabe mais uma aba) */
  desktopOnly?: boolean
}

/**
 * Navegação principal. No celular fica fixa embaixo (como nos mockups);
 * em telas largas vira uma barra lateral.
 */
export function BottomNav({ items }: { items: NavItem[] }) {
  const { pathname } = useLocation()
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur
        lg:inset-y-0 lg:right-auto lg:w-56 lg:border-t-0 lg:border-r lg:pt-24 lg:pb-0"
    >
      <ul className="mx-auto flex max-w-xl justify-around lg:flex-col lg:gap-1 lg:px-3">
        {items.map((item) => {
          const { to, label, icon: Icon } = item
          const active = isNavActive(pathname, item)
          return (
            <li key={to} className={item.desktopOnly ? 'hidden lg:block' : 'flex-1 lg:flex-none'}>
              <Link
                to={to}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition lg:flex-row lg:gap-3 lg:rounded-xl lg:px-3 lg:text-sm ${
                  active ? 'text-primary lg:bg-lavender-soft' : 'text-muted hover:text-ink'
                }`}
              >
                <Icon className="h-6 w-6 lg:h-5 lg:w-5" strokeWidth={1.75} aria-hidden="true" />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
