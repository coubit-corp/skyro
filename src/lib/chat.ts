// Regras puras do chat: validação, agrupamento por dia e lista de conversas.

import { toISODate } from './dates'

export const MESSAGE_MAX = 2000

export interface ChatMessage {
  id: string
  person_id: string
  professional_id: string
  sender_id: string
  body: string
  created_at: string
  read_at: string | null
}

/** Limpa o texto antes de enviar; devolve null se não há o que enviar. */
export function cleanMessage(raw: string): string | null {
  const text = raw
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (!text) return null
  return text.slice(0, MESSAGE_MAX)
}

/** "Hoje", "Ontem" ou "12 de novembro" (no fuso do aparelho). */
export function dayLabel(createdAt: string, now = new Date()): string {
  const day = toISODate(new Date(createdAt))
  const today = toISODate(now)
  const y = new Date(now)
  y.setDate(y.getDate() - 1)
  if (day === today) return 'Hoje'
  if (day === toISODate(y)) return 'Ontem'
  return new Date(createdAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
}

/** "09:12" */
export function timeLabel(createdAt: string): string {
  return new Date(createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/** Separa as mensagens (já em ordem) em blocos por dia, para o divisor "Hoje". */
export function groupByDay<T extends Pick<ChatMessage, 'created_at'>>(messages: T[], now = new Date()) {
  const groups: { label: string; items: T[] }[] = []
  for (const m of messages) {
    const label = dayLabel(m.created_at, now)
    const last = groups.at(-1)
    if (last && last.label === label) last.items.push(m)
    else groups.push({ label, items: [m] })
  }
  return groups
}

/** Mensagens que eu recebi e ainda não li. */
export function unreadFor(messages: ChatMessage[], meId: string): ChatMessage[] {
  return messages.filter((m) => m.sender_id !== meId && m.read_at == null)
}

export interface ConversationSummary {
  /** id da outra pessoa da conversa */
  otherId: string
  last: ChatMessage | null
  unread: number
}

/**
 * Junta as mensagens por conversa. `side` diz de que lado eu estou:
 * a pessoa conversa com profissionais, o profissional conversa com pessoas.
 * `contacts` garante que contatos sem mensagem também aparecem.
 * Ordem: não lidas primeiro, depois a conversa mais recente.
 */
export function summarizeConversations(
  messages: ChatMessage[],
  meId: string,
  side: 'person' | 'professional',
  contacts: string[] = [],
): ConversationSummary[] {
  const map = new Map<string, ConversationSummary>()
  for (const id of contacts) map.set(id, { otherId: id, last: null, unread: 0 })
  for (const m of messages) {
    const otherId = side === 'person' ? m.professional_id : m.person_id
    const s = map.get(otherId) ?? { otherId, last: null, unread: 0 }
    if (!s.last || m.created_at > s.last.created_at) s.last = m
    if (m.sender_id !== meId && m.read_at == null) s.unread++
    map.set(otherId, s)
  }
  return [...map.values()].sort((a, b) => {
    if (a.unread > 0 !== b.unread > 0) return a.unread > 0 ? -1 : 1
    return (b.last?.created_at ?? '').localeCompare(a.last?.created_at ?? '')
  })
}
