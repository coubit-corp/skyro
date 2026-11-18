import { ChevronLeft, SendHorizontal } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import { useMarkRead, useSendMessage, useThread } from '../hooks/useMessages'
import { cleanMessage, dayLabel, groupByDay, MESSAGE_MAX, timeLabel } from '../lib/messages'
import { Avatar } from './Avatar'
import { ErrorState, Skeleton } from './ui'

/**
 * Uma conversa entre a pessoa e um profissional: cabeçalho, mensagens
 * separadas por dia e caixa de texto. Serve para os dois lados.
 */
export function ChatThread({
  personId,
  professionalId,
  other,
  subtitle,
  back,
  headerAction,
  emptyHint,
}: {
  personId: string
  professionalId: string
  other: { full_name: string; avatar_seed: string | null; avatar_path: string | null }
  subtitle?: ReactNode
  /** Só no celular (ou na tela da pessoa): link para voltar à lista */
  back?: { to: string; label: string; mobileOnly?: boolean }
  headerAction?: ReactNode
  emptyHint: string
}) {
  const { session } = useAuth()
  const me = session?.user.id
  const thread = useThread(personId, professionalId)
  const send = useSendMessage()
  const markRead = useMarkRead()
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const inputId = useId()
  const messages = thread.data ?? []
  const unreadIncoming = messages.some((m) => m.sender_id !== me && !m.read_at)
  const lastId = messages.at(-1)?.id

  // Marca como lido o que chegou enquanto a conversa está aberta.
  const { mutate: markReadMutate, isPending: markingRead } = markRead
  useEffect(() => {
    if (unreadIncoming && !markingRead) markReadMutate({ personId, professionalId })
  }, [unreadIncoming, markingRead, markReadMutate, personId, professionalId])

  // Rola para a última mensagem quando chega ou sai uma.
  useLayoutEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lastId])

  const firstName = other.full_name.split(' ')[0]
  const cleaned = cleanMessage(text)

  async function submit(e?: FormEvent) {
    e?.preventDefault()
    if (!cleaned || send.isPending) return
    try {
      await send.mutateAsync({ personId, professionalId, body: cleaned })
      setText('')
    } catch {
      /* a mensagem de erro aparece acima da caixa de texto */
    }
  }

  return (
    <section className="flex h-[calc(100dvh-12rem)] min-h-96 flex-col overflow-hidden rounded-card bg-card lg:h-[calc(100dvh-9rem)]">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        {back && (
          <Link
            to={back.to}
            className={`-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary hover:bg-lavender-soft ${back.mobileOnly ? 'lg:hidden' : ''}`}
            aria-label={back.label}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
        )}
        <Avatar seed={other.avatar_seed} photo={other.avatar_path} name={other.full_name} size={40} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold">{other.full_name}</h1>
          {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
        </div>
        {headerAction}
      </header>

      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite" aria-relevant="additions">
        {thread.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="ml-auto h-12 w-1/2" />
          </div>
        ) : thread.error ? (
          <ErrorState message={thread.error.message} onRetry={() => thread.refetch()} />
        ) : messages.length === 0 ? (
          <p className="mx-auto max-w-xs pt-8 text-center text-sm text-muted">{emptyHint}</p>
        ) : (
          groupByDay(messages).map((g) => (
            <div key={g.day} className="space-y-1.5">
              <p className="sticky top-0 z-10 mx-auto w-fit rounded-full bg-chip px-3 py-1 text-xs font-semibold text-muted first-letter:uppercase">
                {dayLabel(g.items[0].created_at)}
              </p>
              <ul className="space-y-1.5">
                {g.items.map((m) => {
                  const mine = m.sender_id === me
                  return (
                    <li key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                          mine ? 'rounded-br-md bg-primary text-white' : 'rounded-bl-md bg-chip text-ink'
                        }`}
                      >
                        <span className="sr-only">{mine ? 'Você' : firstName}: </span>
                        <p className="break-words whitespace-pre-wrap">{m.body}</p>
                        <p className={`mt-0.5 text-right text-[11px] ${mine ? 'opacity-75' : 'text-muted'}`}>
                          {timeLabel(m.created_at)}
                          {mine && m.read_at && <span> · lida</span>}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))
        )}
      </div>

      <form onSubmit={submit} className="border-t border-line p-3">
        {send.isError && (
          <p role="alert" className="mb-2 rounded-xl bg-attention-soft px-3 py-2 text-xs text-attention">
            {send.error.message}
          </p>
        )}
        <div className="flex items-end gap-2">
          <label htmlFor={inputId} className="sr-only">
            Mensagem para {firstName}
          </label>
          <textarea
            id={inputId}
            rows={1}
            className="input max-h-32 min-h-11 resize-none py-2.5"
            placeholder={`Mensagem para ${firstName}`}
            maxLength={MESSAGE_MAX}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              // cresce com o texto, até o máximo
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`
            }}
            onKeyDown={(e) => {
              // Enter envia; Shift+Enter quebra a linha
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                void submit()
              }
            }}
          />
          <button
            type="submit"
            className="btn-primary h-11 w-11 shrink-0 p-0"
            disabled={!cleaned || send.isPending}
            aria-label="Enviar mensagem"
          >
            <SendHorizontal className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </form>
    </section>
  )
}
