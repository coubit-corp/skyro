import { Link } from 'react-router-dom'
import type { ConversationSummary } from '../lib/chat'
import { dayLabel, timeLabel } from '../lib/chat'
import { Avatar } from './Avatar'

export interface ConversationContact {
  id: string
  name: string
  subtitle?: string
  seed?: string | null
  photo?: string | null
}

/** Lista de conversas: quem tem mensagem não lida aparece primeiro, com o contador. */
export function ConversationList({
  items,
  contacts,
  meId,
  hrefFor,
}: {
  items: ConversationSummary[]
  contacts: Map<string, ConversationContact>
  meId: string
  hrefFor: (id: string) => string
}) {
  return (
    <ul className="space-y-3">
      {items.map((c) => {
        const who = contacts.get(c.otherId)
        if (!who) return null
        const last = c.last
        const when = last
          ? dayLabel(last.created_at) === 'Hoje'
            ? timeLabel(last.created_at)
            : dayLabel(last.created_at)
          : ''
        return (
          <li key={c.otherId}>
            <Link
              to={hrefFor(c.otherId)}
              className="card flex items-center gap-3 transition hover:ring-2 hover:ring-lavender"
            >
              <Avatar seed={who.seed} photo={who.photo} name={who.name} size={48} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={`truncate ${c.unread ? 'font-bold' : 'font-semibold'}`}>{who.name}</p>
                  <span className="shrink-0 text-xs text-muted">{when}</span>
                </div>
                {who.subtitle && <p className="text-xs text-muted">{who.subtitle}</p>}
                <p className={`truncate text-sm ${c.unread ? 'font-semibold text-ink' : 'text-muted'}`}>
                  {last ? `${last.sender_id === meId ? 'Você: ' : ''}${last.body}` : 'Comece uma conversa'}
                </p>
              </div>
              {c.unread > 0 && (
                <span
                  className="flex h-6 min-w-6 items-center justify-center rounded-full bg-attention px-1.5 text-xs font-bold text-white"
                  aria-label={`${c.unread} ${c.unread === 1 ? 'mensagem não lida' : 'mensagens não lidas'}`}
                >
                  {c.unread}
                </span>
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
