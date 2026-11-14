import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Só fica ativo no caminho exato (não nas subpáginas). */
  end?: boolean
}

/**
 * Navegação principal. No celular fica fixa embaixo (como nos mockups);
 * em telas largas vira uma barra lateral.
 */
export function BottomNav({ items }: { items: NavItem[] }) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur
        lg:inset-y-0 lg:right-auto lg:w-56 lg:border-t-0 lg:border-r lg:pt-24 lg:pb-0"
    >
      <ul className="mx-auto flex max-w-xl justify-around lg:flex-col lg:gap-1 lg:px-3">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1 lg:flex-none">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition lg:flex-row lg:gap-3 lg:rounded-xl lg:px-3 lg:text-sm ${
                  isActive ? 'text-primary lg:bg-lavender-soft' : 'text-muted hover:text-ink'
                }`
              }
            >
              <Icon className="h-6 w-6 lg:h-5 lg:w-5" strokeWidth={1.75} aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
