import { describe, expect, it } from 'vitest'
import { addDays } from './dates'
import { bestStreak, currentStreak } from './streak'

const T = '2026-11-14'
const days = (...ago: number[]) => new Set(ago.map((n) => addDays(T, -n)))

describe('currentStreak', () => {
  it('conta a partir de hoje quando hoje tem marcação', () => {
    expect(currentStreak(days(0, 1, 2), T)).toBe(3)
  })
  it('conta a partir de ontem quando hoje ainda não tem (o dia não acabou)', () => {
    expect(currentStreak(days(1, 2, 3, 4), T)).toBe(4)
  })
  it('zera quando falhou ontem e hoje', () => {
    expect(currentStreak(days(2, 3, 4), T)).toBe(0)
  })
  it('para no primeiro buraco', () => {
    expect(currentStreak(days(0, 1, 3, 4, 5), T)).toBe(2)
  })
  it('atravessa a virada de mês', () => {
    expect(currentStreak(new Set(['2026-10-30', '2026-10-31', '2026-11-01']), '2026-11-01')).toBe(3)
  })
})

describe('bestStreak', () => {
  it('acha a maior sequência', () => {
    expect(bestStreak(days(0, 1, 5, 6, 7, 8, 20))).toBe(4)
  })
  it('é 0 sem marcações', () => {
    expect(bestStreak(new Set())).toBe(0)
  })
})
