import { usePersonConversations, useProConversations } from '../hooks/useMessages'
import { unreadLabel } from '../lib/messages'

function Badge({ count, className = '' }: { count: number; className?: string }) {
  if (!count) return null
  return (
    <span
      className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-attention px-1.5 text-[11px] font-bold text-white ${className}`}
    >
      {count > 9 ? '9+' : count}
      <span className="sr-only"> ({unreadLabel(count)})</span>
    </span>
  )
}

/** Número de mensagens não lidas da pessoa (todas as conversas). */
export function PersonUnreadBadge({ className }: { className?: string }) {
  const list = usePersonConversations()
  return <Badge count={list.data?.reduce((n, c) => n + c.unread, 0) ?? 0} className={className} />
}

/** Número de mensagens não lidas do profissional (todas as conversas). */
export function ProUnreadBadge({ className }: { className?: string }) {
  const list = useProConversations()
  return <Badge count={list.data?.reduce((n, c) => n + c.unread, 0) ?? 0} className={className} />
}
