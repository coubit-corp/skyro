import { describe, expect, it } from 'vitest'
import {
  cleanMessage,
  dayLabel,
  groupByDay,
  MESSAGE_MAX,
  summarizeConversations,
  unreadFor,
  type ChatMessage,
} from './chat'

const ME = 'me'
const msg = (id: string, over: Partial<ChatMessage>): ChatMessage => ({
  id,
  person_id: 'p1',
  professional_id: ME,
  sender_id: 'p1',
  body: 'oi',
  created_at: '2026-11-17T12:00:00Z',
  read_at: null,
  ...over,
})

describe('cleanMessage', () => {
  it('recusa mensagem vazia ou só com espaços', () => {
    expect(cleanMessage('   \n  ')).toBeNull()
  })
  it('tira espaços das pontas e junta linhas em branco demais', () => {
    expect(cleanMessage('  oi\n\n\n\ntudo bem?  ')).toBe('oi\n\ntudo bem?')
  })
  it('corta no limite de caracteres', () => {
    expect(cleanMessage('a'.repeat(MESSAGE_MAX + 50))?.length).toBe(MESSAGE_MAX)
  })
})

describe('dayLabel e groupByDay', () => {
  const now = new Date(2026, 10, 17, 15, 0)
  it('diz Hoje, Ontem ou a data', () => {
    expect(dayLabel(new Date(2026, 10, 17, 9, 0).toISOString(), now)).toBe('Hoje')
    expect(dayLabel(new Date(2026, 10, 16, 23, 30).toISOString(), now)).toBe('Ontem')
    expect(dayLabel(new Date(2026, 10, 12, 10, 0).toISOString(), now)).toBe('12 de novembro')
  })
  it('agrupa mensagens seguidas do mesmo dia', () => {
    const g = groupByDay(
      [
        { created_at: new Date(2026, 10, 16, 20, 0).toISOString() },
        { created_at: new Date(2026, 10, 17, 9, 0).toISOString() },
        { created_at: new Date(2026, 10, 17, 9, 5).toISOString() },
      ],
      now,
    )
    expect(g.map((x) => [x.label, x.items.length])).toEqual([
      ['Ontem', 1],
      ['Hoje', 2],
    ])
  })
})

describe('unreadFor', () => {
  it('conta só o que eu recebi e não li', () => {
    const list = [msg('1', {}), msg('2', { read_at: 'x' }), msg('3', { sender_id: ME })]
    expect(unreadFor(list, ME).map((m) => m.id)).toEqual(['1'])
  })
})

describe('summarizeConversations', () => {
  it('agrupa por contato, conta não lidas e põe não lidas primeiro', () => {
    const list = [
      msg('a1', { person_id: 'ana', sender_id: ME, created_at: '2026-11-17T10:00:00Z' }),
      msg('b1', { person_id: 'bia', sender_id: 'bia', created_at: '2026-11-17T08:00:00Z' }),
      msg('b2', { person_id: 'bia', sender_id: 'bia', created_at: '2026-11-17T09:00:00Z' }),
    ]
    const s = summarizeConversations(list, ME, 'professional', ['ana', 'bia', 'caio'])
    expect(s.map((c) => [c.otherId, c.unread, c.last?.id ?? null])).toEqual([
      ['bia', 2, 'b2'],
      ['ana', 0, 'a1'],
      ['caio', 0, null],
    ])
  })
  it('do lado da pessoa, o contato é o profissional', () => {
    const s = summarizeConversations(
      [msg('x', { person_id: ME, professional_id: 'pro', sender_id: 'pro' })],
      ME,
      'person',
    )
    expect(s).toEqual([{ otherId: 'pro', last: expect.objectContaining({ id: 'x' }), unread: 1 }])
  })
})
