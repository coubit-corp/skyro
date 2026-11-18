import { describe, expect, it } from 'vitest'
import type { Message } from './database.types'
import { cleanMessage, dayLabel, groupByDay, previewText, summarizeConversations, unreadLabel } from './messages'

const PRO = 'pro'
const msg = (p: Partial<Message>): Message => ({
  id: Math.random().toString(36),
  person_id: 'p1',
  professional_id: PRO,
  sender_id: 'p1',
  body: 'oi',
  created_at: '2026-11-18T10:00:00Z',
  read_at: null,
  ...p,
})

describe('summarizeConversations', () => {
  const contacts = [
    { otherId: 'p1', other: { full_name: 'Beatriz' }, since: '2026-01-01' },
    { otherId: 'p2', other: { full_name: 'Zeca' }, since: '2026-01-01' },
    { otherId: 'p3', other: { full_name: 'Ana' }, since: '2026-01-01' },
    { otherId: 'p4', other: { full_name: 'Bruno' }, since: '2026-01-01' },
  ]
  const messages = [
    msg({ person_id: 'p1', created_at: '2026-11-18T09:00:00Z' }),
    msg({ person_id: 'p1', created_at: '2026-11-18T09:05:00Z', read_at: '2026-11-18T09:06:00Z' }),
    msg({ person_id: 'p1', sender_id: PRO, created_at: '2026-11-18T09:10:00Z' }),
    msg({ person_id: 'p2', created_at: '2026-11-18T11:00:00Z' }),
  ]
  const list = summarizeConversations(contacts, messages, PRO, 'professional')
  it('ordena pela última mensagem e deixa quem não conversou no fim, por nome', () => {
    expect(list.map((c) => c.otherId)).toEqual(['p2', 'p1', 'p3', 'p4'])
  })
  it('conta só as recebidas e não lidas', () => {
    expect(list.find((c) => c.otherId === 'p1')!.unread).toBe(1)
    expect(list.find((c) => c.otherId === 'p1')!.last!.sender_id).toBe(PRO)
  })
  it('do lado da pessoa, agrupa pelo profissional', () => {
    const l = summarizeConversations([{ otherId: PRO, other: { full_name: 'Ana' }, since: '' }], messages.slice(0, 3), 'p1', 'person')
    expect(l[0].unread).toBe(1)
  })
})

describe('textos', () => {
  it('previewText', () => {
    expect(previewText(null, PRO)).toBe('Nenhuma mensagem ainda')
    expect(previewText(msg({ sender_id: PRO, body: 'Pode   sim!\nAbraço' }), PRO)).toBe('Você: Pode sim! Abraço')
    expect(previewText(msg({ body: 'a'.repeat(100) }), PRO, 10)).toBe('aaaaaaaaa…')
  })
  it('dayLabel', () => {
    const now = new Date(2026, 10, 18, 15, 0)
    expect(dayLabel(new Date(2026, 10, 18, 8, 0).toISOString(), now)).toBe('Hoje')
    expect(dayLabel(new Date(2026, 10, 17, 23, 0).toISOString(), now)).toBe('Ontem')
    expect(dayLabel(new Date(2026, 10, 16, 9, 0).toISOString(), now)).toBe('segunda-feira')
    expect(dayLabel(new Date(2026, 9, 2, 9, 0).toISOString(), now)).toMatch(/^2 de out/)
    expect(dayLabel(new Date(2025, 9, 2, 9, 0).toISOString(), now)).toMatch(/2025/)
  })
  it('groupByDay separa por dia local', () => {
    const g = groupByDay([
      msg({ created_at: new Date(2026, 10, 17, 22, 0).toISOString() }),
      msg({ created_at: new Date(2026, 10, 18, 8, 0).toISOString() }),
      msg({ created_at: new Date(2026, 10, 18, 9, 0).toISOString() }),
    ])
    expect(g.map((x) => x.items.length)).toEqual([1, 2])
  })
  it('cleanMessage', () => {
    expect(cleanMessage('   ')).toBeNull()
    expect(cleanMessage(' oi\r\n\n\n\ntudo bem? ')).toBe('oi\n\ntudo bem?')
    expect(cleanMessage('a'.repeat(2001))).toBeNull()
  })
  it('unreadLabel', () => {
    expect(unreadLabel(1)).toBe('1 mensagem nova')
    expect(unreadLabel(3)).toBe('3 mensagens novas')
  })
})
