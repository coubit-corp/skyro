import { describe, expect, it } from 'vitest'
import { evaluatePatient } from './alerts'
import type { DailyLog } from './database.types'
import { addDays } from './dates'
import { buildWeekSummary } from './weekSummary'

const T = '2026-11-14'
const log = (ago: number, over: Partial<DailyLog> = {}): DailyLog => ({
  id: String(ago), user_id: 'u', log_date: addDays(T, -ago), sleep_hours: 7.5, water_liters: 2, water_goal_liters: 2,
  focus_minutes: 60, workout_planned: true, workout_done: true, mood: null, pain_level: null, created_at: '', updated_at: '', ...over,
})

describe('buildWeekSummary', () => {
  it('sem registros pede contato', () => {
    const s = buildWeekSummary([], evaluatePatient([], T), T)
    expect(s.lines).toEqual(['Nenhum registro nos últimos 7 dias.'])
  })

  it('aponta o padrão sono × treino e o ponto de atenção (cenário do Lucas)', () => {
    const logs = [
      log(0, { sleep_hours: 5.5, workout_done: false }),
      log(1, { sleep_hours: 6.2, workout_done: false, water_liters: 1.6 }),
      log(2, { sleep_hours: 5.8 }),
      log(3, { sleep_hours: 6, workout_done: false }),
      ...[4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((i) => log(i)),
    ]
    const s = buildWeekSummary(logs, evaluatePatient(logs, T), T)
    expect(s.lines[0]).toMatch(/^Dormiu em média .* menos que na semana anterior \(7h30\)\.$/)
    expect(s.lines).toContain('Treinou 5 de 7 vezes planejadas.')
    expect(s.lines).toContain('Nos dias em que dormiu menos de 6h30, faltou a 2 de 3 treinos.')
    expect(s.attention).toBe('Ponto de atenção: dormiu 5h30; faltou a 2 treinos na semana.')
  })

  it('semana tranquila', () => {
    const logs = Array.from({ length: 14 }, (_, i) => log(i))
    const s = buildWeekSummary(logs, evaluatePatient(logs, T), T)
    expect(s.attention).toBe('Nada fora do comum nesta semana.')
    expect(s.lines).toContain('Bateu a meta de água em 6 de 6 dias.')
  })
})
