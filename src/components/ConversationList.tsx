import { Link } from 'react-router-dom'
import type { ProfileBrief } from '../lib/database.types'
import { listTimeLabel, previewText, unreadLabel, type ConversationSummary } from '../lib/messages'
import { Avatar } from './Avatar'

/** Lista de conversas: foto, nome, prévia da última mensagem e não lidas. */
export function ConversationList<T extends ProfileBrief>({
  items,
  meId,
  hrefFor,
  activeId,
  detail,
}: {
  items: ConversationSummary<T>[]
  meId: string
  hrefFor: (otherId: string) => string
  activeId?: string
  /** Linha extra embaixo do nome (ex.: a especialidade do profissional) */
  detail?: (other: T) => string
}) {
  return (
    <ul className="divide-y divide-line">
      {items.map((c) => {
        const active = c.otherId === activeId
        return (
          <li key={c.otherId}>
            <Link
              to={hrefFor(c.otherId)}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-3 transition hover:bg-lavender-soft/60 ${active ? 'bg-lavender-soft' : ''}`}
            >
              <Avatar seed={c.other.avatar_seed} photo={c.other.avatar_path} name={c.other.full_name} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={`truncate text-sm ${c.unread ? 'font-bold' : 'font-semibold'}`}>{c.other.full_name}</p>
                  {c.last && (
                    <span className={`shrink-0 text-xs ${c.unread ? 'font-semibold text-primary' : 'text-muted'}`}>
                      {listTimeLabel(c.last.created_at)}
                    </span>
                  )}
                </div>
                {detail && <p className="truncate text-xs text-muted">{detail(c.other)}</p>}
                <div className="flex items-center justify-between gap-2">
                  <p className={`truncate text-sm ${c.unread ? 'font-medium text-ink' : 'text-muted'}`}>{previewText(c.last, meId)}</p>
                  {c.unread > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-white">
                      {c.unread}
                      <span className="sr-only"> ({unreadLabel(c.unread)})</span>
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
