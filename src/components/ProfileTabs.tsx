import { Link, useLocation } from 'react-router-dom'

const TABS = [
  { to: '/pro/configuracoes', label: 'Perfil' },
  { to: '/pro/configuracoes/galeria', label: 'Fotos e vídeos' },
]

/** Abas do perfil do profissional, em Configurações: dados do perfil e galeria. */
export function ProfileTabs() {
  const { pathname } = useLocation()
  const path = pathname.replace(/\/+$/, '')
  return (
    <nav aria-label="Seções do perfil" className="flex gap-1 rounded-2xl bg-chip p-1">
      {TABS.map((t) => {
        const active = path === t.to
        return (
          <Link
            key={t.to}
            to={t.to}
            aria-current={active ? 'page' : undefined}
            className={`flex-1 rounded-xl px-3 py-2.5 text-center text-sm font-semibold transition ${
              active ? 'bg-card text-primary shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
