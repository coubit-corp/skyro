import { describe, expect, it } from 'vitest'
import { addDays, formatHours, formatMinutes, toISODate, weekOf } from './dates'

describe('datas', () => {
  it('toISODate usa o dia local, não UTC (23h em São Paulo continua sendo o mesmo dia)', () => {
    const lateNight = new Date(2026, 10, 13, 23, 30) // 13/11 23:30 no fuso do aparelho
    expect(toISODate(lateNight)).toBe('2026-11-13')
  })
  it('addDays vira mês e ano', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('weekOf vai de segunda a domingo', () => {
    expect(weekOf('2026-11-14')).toEqual([
      '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15',
    ])
    // domingo pertence à semana que começou na segunda anterior
    expect(weekOf('2026-11-15')[0]).toBe('2026-11-09')
  })
  it('formata horas e minutos', () => {
    expect(formatHours(5.5)).toBe('5h30')
    expect(formatHours(7)).toBe('7h')
    expect(formatHours(null)).toBe('—')
    expect(formatMinutes(100)).toBe('1h 40min')
    expect(formatMinutes(40)).toBe('40min')
    expect(formatMinutes(120)).toBe('2h')
  })
})
