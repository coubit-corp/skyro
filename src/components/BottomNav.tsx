import type { LucideIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useUnreadCount } from '../hooks/useChat'
import { isNavActive, type NavMatch } from '../lib/nav'

export interface NavItem extends NavMatch {
  label: string
  icon: LucideIcon
  /** Só aparece na barra lateral do desktop (no celular não cabe mais uma aba) */
  desktopOnly?: boolean
  /** Caminhos que ativam a aba só no celular, onde a aba própria deles não aparece */
  mobileAlsoActiveOn?: string[]
  /** Mostra o número de mensagens não lidas ao lado do nome */
  unreadFor?: 'person' | 'professional'
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
          const mobileOnlyActive =
            !active && (item.mobileAlsoActiveOn ?? []).some((prefix) => isNavActive(pathname, { to: prefix }))
          return (
            <li key={to} className={item.desktopOnly ? 'hidden lg:block' : 'flex-1 lg:flex-none'}>
              <Link
                to={to}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition lg:flex-row lg:gap-3 lg:rounded-xl lg:px-3 lg:text-sm ${
                  active
                    ? 'text-primary lg:bg-lavender-soft'
                    : mobileOnlyActive
                      ? 'text-primary lg:text-muted lg:hover:text-ink'
                      : 'text-muted hover:text-ink'
                }`}
              >
                <Icon className="h-6 w-6 lg:h-5 lg:w-5" strokeWidth={1.75} aria-hidden="true" />
                {label}
                {item.unreadFor && <UnreadBadge side={item.unreadFor} />}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function UnreadBadge({ side }: { side: 'person' | 'professional' }) {
  const unread = useUnreadCount(side)
  if (!unread) return null
  return (
    <span className="absolute top-1 left-[calc(50%+4px)] flex h-5 lg:static lg:ml-auto min-w-5 items-center justify-center rounded-full bg-attention px-1.5 text-[11px] font-bold text-white">
      {unread > 9 ? '9+' : unread}
      <span className="sr-only">{unread === 1 ? ' não lida' : ' não lidas'}</span>
    </span>
  )
}
