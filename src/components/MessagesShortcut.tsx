import { MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useUnreadCount } from '../hooks/useChat'

/** Atalho para as mensagens, com o número de mensagens não lidas. */
export function MessagesShortcut({ to, side }: { to: string; side: 'person' | 'professional' }) {
  const unread = useUnreadCount(side)
  return (
    <Link
      to={to}
      className="relative flex h-11 w-11 items-center justify-center rounded-full bg-card text-primary ring-lavender transition hover:ring-2"
      aria-label={unread ? `Mensagens, ${unread} não ${unread === 1 ? 'lida' : 'lidas'}` : 'Mensagens'}
    >
      <MessageCircle className="h-5 w-5" aria-hidden="true" />
      {unread > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-surface bg-attention px-1 text-[10px] font-bold text-white"
          aria-hidden="true"
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}
