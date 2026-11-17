import { ChevronLeft, Send } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { cleanMessage, groupByDay, MESSAGE_MAX, timeLabel, type ChatMessage } from '../lib/chat'
import { Avatar } from './Avatar'
import { ErrorState, Skeleton } from './ui'

export interface ChatPeer {
  name: string
  subtitle?: string
  seed?: string | null
  photo?: string | null
}

/**
 * Tela de conversa: cabeçalho com quem está do outro lado, mensagens agrupadas
 * por dia (as minhas à direita, em azul) e a caixa de envio presa embaixo.
 * Enter envia; Shift+Enter quebra a linha.
 */
export function ChatThread({
  meId,
  peer,
  back,
  messages,
  loading,
  error,
  onRetry,
  onSend,
  sending,
  sendError,
  closedReason,
  placeholder,
}: {
  meId: string
  peer: ChatPeer
  back: { to: string; label: string }
  messages: ChatMessage[] | undefined
  loading: boolean
  error?: string
  onRetry?: () => void
  onSend: (body: string) => Promise<unknown>
  sending: boolean
  sendError?: string
  /** Quando preenchido, a conversa fica só para leitura e mostra o motivo. */
  closedReason?: string
  placeholder: string
}) {
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const count = messages?.length ?? 0

  // Desce para a última mensagem quando a conversa abre ou chega mensagem nova.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [count])

  async function send(e?: FormEvent) {
    e?.preventDefault()
    const body = cleanMessage(draft)
    if (!body || sending) return
    try {
      await onSend(body)
      setDraft('')
    } catch {
      /* o erro aparece embaixo da caixa; o texto continua lá para tentar de novo */
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send()
    }
  }

  return (
    <section className="flex min-h-[calc(100dvh-10rem)] flex-col lg:min-h-[calc(100dvh-6rem)]">
      <header className="mb-3 space-y-2">
        <Link to={back.to} className="tap gap-1 text-sm font-semibold text-primary">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> {back.label}
        </Link>
        <div className="flex items-center gap-3">
          <Avatar seed={peer.seed} photo={peer.photo} name={peer.name} size={44} />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">{peer.name}</h1>
            {peer.subtitle && <p className="text-xs text-muted">{peer.subtitle}</p>}
          </div>
        </div>
      </header>

      <div
        className="flex-1 space-y-4 rounded-card bg-lavender-soft/40 p-3"
        role="log"
        aria-live="polite"
        aria-label={`Conversa com ${peer.name}`}
      >
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="ml-auto h-12 w-1/2" />
            <Skeleton className="h-12 w-3/5" />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={onRetry} />
        ) : count === 0 ? (
          <p className="py-10 text-center text-sm text-muted">
            Nenhuma mensagem ainda.
            {!closedReason && ' Escreva a primeira!'}
          </p>
        ) : (
          groupByDay(messages!).map((g) => (
            <div key={g.label} className="space-y-2">
              <p className="text-center">
                <span className="chip bg-card text-[11px]">{g.label}</span>
              </p>
              {g.items.map((m) => {
                const mine = m.sender_id === meId
                return (
                  <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                    <p
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words sm:max-w-[70%] ${
                        mine ? 'rounded-br-md bg-primary text-white' : 'rounded-bl-md bg-card text-ink'
                      }`}
                    >
                      <span className="sr-only">{mine ? 'Você: ' : `${peer.name}: `}</span>
                      {m.body}
                    </p>
                    <span className="mt-0.5 px-1 text-[11px] text-muted">
                      {timeLabel(m.created_at)}
                      {mine && (m.read_at ? ' · lida' : '')}
                    </span>
                  </div>
                )
              })}
            </div>
          ))
        )}
        {/* A margem faz a rolagem passar da caixa de envio, que fica presa embaixo */}
        <div ref={endRef} className="scroll-mb-40 lg:scroll-mb-24" />
      </div>

      {closedReason ? (
        <p className="mt-3 rounded-card bg-card p-4 text-center text-sm text-muted">{closedReason}</p>
      ) : (
        <form
          onSubmit={send}
          className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] mt-3 bg-surface pb-1 lg:bottom-4"
        >
          <div className="flex items-end gap-2">
            <label className="sr-only" htmlFor="chat-input">
              Mensagem para {peer.name}
            </label>
            <textarea
              id="chat-input"
              rows={1}
              className="input max-h-32 min-h-12 resize-none"
              placeholder={placeholder}
              value={draft}
              maxLength={MESSAGE_MAX}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <button
              type="submit"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white transition hover:bg-primary-dark disabled:opacity-50"
              disabled={sending || !cleanMessage(draft)}
              aria-label="Enviar mensagem"
            >
              <Send className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          {sendError && (
            <p role="alert" className="mt-1 text-xs text-attention">
              Não deu para enviar: {sendError}
            </p>
          )}
        </form>
      )}
    </section>
  )
}
