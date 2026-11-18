// Regras das mensagens entre a pessoa e o profissional: lista de conversas,
// separação por dia e textos curtos. Quem pode ler e enviar é o banco que decide
// (migration 20261118000002).

import type { Message } from './database.types'

export const MESSAGE_MAX = 2000

export interface ConversationSummary<T> {
  /** id da outra parte (pessoa, para o profissional; profissional, para a pessoa) */
  otherId: string
  other: T
  last: Message | null
  unread: number
  /** Quando começou o compartilhamento, para ordenar quem ainda não conversou */
  since: string
}

/**
 * Junta os contatos (compartilhamentos ativos) com as mensagens e devolve a
 * lista de conversas: as mais recentes primeiro; quem ainda não conversou vai
 * para o fim, em ordem alfabética.
 */
export function summarizeConversations<T extends { full_name: string }>(
  contacts: { otherId: string; other: T; since: string }[],
  messages: Message[],
  meId: string,
  side: 'person' | 'professional',
): ConversationSummary<T>[] {
  const otherOf = (m: Message) => (side === 'professional' ? m.person_id : m.professional_id)
  return contacts
    .map((c) => {
      const mine = messages.filter((m) => otherOf(m) === c.otherId)
      const last = mine.reduce<Message | null>((acc, m) => (!acc || m.created_at > acc.created_at ? m : acc), null)
      const unread = mine.filter((m) => m.sender_id !== meId && !m.read_at).length
      return { ...c, last, unread }
    })
    .sort((a, b) => {
      if (a.last && b.last) return b.last.created_at.localeCompare(a.last.created_at)
      if (a.last) return -1
      if (b.last) return 1
      return a.other.full_name.localeCompare(b.other.full_name, 'pt-BR')
    })
}

/** Prévia da última mensagem na lista ("Você: Pode sim!"). */
export function previewText(last: Message | null, meId: string, max = 70): string {
  if (!last) return 'Nenhuma mensagem ainda'
  const text = last.body.replace(/\s+/g, ' ').trim()
  const short = text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
  return last.sender_id === meId ? `Você: ${short}` : short
}

function localDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** "Hoje", "Ontem", "segunda-feira" (até 6 dias) ou "12 de nov." */
export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const that = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = Math.round((today.getTime() - that.getTime()) / 86_400_000)
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Ontem'
  if (diff > 1 && diff < 7) return d.toLocaleDateString('pt-BR', { weekday: 'long' })
  const sameYear = d.getFullYear() === now.getFullYear()
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) })
}

export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/** Hora da última mensagem na lista: a hora se for hoje; senão o dia. */
export function listTimeLabel(iso: string, now = new Date()): string {
  const day = dayLabel(iso, now)
  return day === 'Hoje' ? timeLabel(iso) : day === 'Ontem' ? 'Ontem' : day.length > 10 ? day.slice(0, 3) + '.' : day
}

/** Mensagens agrupadas por dia (em ordem), para os separadores da conversa. */
export function groupByDay(messages: Message[]): { day: string; items: Message[] }[] {
  const groups: { day: string; items: Message[] }[] = []
  for (const m of messages) {
    const day = localDay(new Date(m.created_at))
    const g = groups.at(-1)
    if (g && g.day === day) g.items.push(m)
    else groups.push({ day, items: [m] })
  }
  return groups
}

/** Texto pronto para enviar, ou null se estiver vazio ou grande demais. */
export function cleanMessage(raw: string): string | null {
  const text = raw.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  return text.length >= 1 && text.length <= MESSAGE_MAX ? text : null
}

export function unreadLabel(n: number): string {
  return n === 1 ? '1 mensagem nova' : `${n} mensagens novas`
}
