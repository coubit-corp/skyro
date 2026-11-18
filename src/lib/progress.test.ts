import { describe, expect, it } from 'vitest'
import type { DailyLog } from './database.types'
import { addDays } from './dates'
import {
  achievements,
  computeXp,
  levelFor,
  sleepWeek,
  weekReport,
  weekStats,
  XP_RULES,
  XP_WINDOW_DAYS,
  type HabitCheckRow,
} from './progress'

const TODAY = '2026-11-14'

function log(daysAgo: number, over: Partial<DailyLog> = {}): DailyLog {
  return {
    id: `l${daysAgo}`,
    user_id: 'u',
    log_date: addDays(TODAY, -daysAgo),
    sleep_hours: 7.5,
    water_liters: 2,
    water_goal_liters: 2,
    focus_minutes: 60,
    workout_planned: true,
    workout_done: true,
    mood: null,
    pain_level: null,
    created_at: '',
    updated_at: '',
    ...over,
  }
}

const check = (daysAgo: number, habit = 'h1'): HabitCheckRow => ({ habit_id: habit, check_date: addDays(TODAY, -daysAgo) })
const days = (n: number, start = 0) => Array.from({ length: n }, (_, i) => i + start)

describe('computeXp', () => {
  it('soma hábitos, registro, treino, água e sono', () => {
    const perfectDay =
      XP_RULES.dailyLog + XP_RULES.workoutDone + XP_RULES.waterGoal + XP_RULES.goodSleep + XP_RULES.habitCheck
    expect(computeXp([log(0)], [check(0)], TODAY)).toBe(perfectDay)
  })

  it('não dá bônus de água nem de sono abaixo da meta', () => {
    const xp = computeXp([log(0, { water_liters: 1, sleep_hours: 5, workout_done: false })], [], TODAY)
    expect(xp).toBe(XP_RULES.dailyLog)
  })

  it(`ignora o que está fora dos últimos ${XP_WINDOW_DAYS} dias`, () => {
    expect(computeXp([log(XP_WINDOW_DAYS)], [check(XP_WINDOW_DAYS)], TODAY)).toBe(0)
    expect(computeXp([log(XP_WINDOW_DAYS - 1)], [], TODAY)).toBeGreaterThan(0)
  })
})

describe('levelFor', () => {
  it('começa no Bronze', () => {
    expect(levelFor(0)).toMatchObject({ current: { name: 'Bronze' }, next: { name: 'Prata' }, missing: 500, progress: 0 })
  })

  it('mostra quanto falta para o próximo nível', () => {
    const l = levelFor(1240)
    expect(l.current.name).toBe('Prata')
    expect(l.next?.name).toBe('Ouro')
    expect(l.missing).toBe(260)
    expect(l.progress).toBeCloseTo(0.74)
  })

  it('no último nível não falta nada', () => {
    expect(levelFor(5000)).toMatchObject({ current: { name: 'Diamante' }, next: null, missing: 0, progress: 1 })
  })
})

describe('weekStats', () => {
  it('semana perfeita dá Score 100', () => {
    const s = weekStats(days(7).map((d) => log(d)), [], TODAY)
    expect(s.score).toBe(100)
    expect(s.workoutsDone).toBe(7)
    expect(s.waterDays).toBe(7)
    expect(s.focusMinutes).toBe(420)
    expect(s.activeDays).toBe(7)
  })

  it('sem nenhum registro não tem Score', () => {
    expect(weekStats([], [], TODAY).score).toBeNull()
  })

  it('conta hábito marcado como dia ativo, mas só dá Score com registro do dia', () => {
    const s = weekStats([], [check(0), check(1)], TODAY)
    expect(s.activeDays).toBe(2)
    expect(s.parts.constancia).toBeCloseTo(2 / 7)
    // só hábitos, sem registro do dia: não há Score (seria 100% só de constância)
    expect(s.score).toBeNull()
  })

  it('treinos e sono pesam no Score', () => {
    const logs = days(7).map((d) => log(d, { workout_done: d % 2 === 0, sleep_hours: 3.5 }))
    const s = weekStats(logs, [], TODAY)
    expect(s.parts.treino).toBeCloseTo(4 / 7)
    expect(s.parts.sono).toBeCloseTo(0.5)
    expect(s.score).toBe(Math.round(100 * (0.5 + 4 / 7 + 1 + 1) / 4))
  })

  it('sem treino planejado, o treino fica fora da média', () => {
    const logs = days(7).map((d) => log(d, { workout_planned: false, workout_done: false }))
    const s = weekStats(logs, [], TODAY)
    expect(s.parts.treino).toBeNull()
    expect(s.score).toBe(100)
  })

  it('não conta dias fora dos 7 dias', () => {
    expect(weekStats([log(7)], [check(7)], TODAY).activeDays).toBe(0)
  })
})

describe('weekReport', () => {
  it('compara com os 7 dias anteriores e aponta o que mais subiu', () => {
    const logs = [
      ...days(7).map((d) => log(d)),
      ...days(7, 7).map((d) => log(d, { workout_done: d % 2 === 0 })),
    ]
    const r = weekReport(logs, [], TODAY)
    expect(r.current.score).toBe(100)
    expect(r.previous.score).toBeLessThan(100)
    expect(r.best?.part).toBe('treino')
    expect(r.improve).toBeNull()
  })

  it('sugere melhorar a parte mais baixa', () => {
    const logs = days(7).map((d) => log(d, { water_liters: 0.5 }))
    const r = weekReport(logs, [], TODAY)
    expect(r.improve?.part).toBe('agua')
  })

  it('sem registros não tem destaque', () => {
    const r = weekReport([], [], TODAY)
    expect(r.best).toBeNull()
    expect(r.improve).toBeNull()
  })
})

describe('achievements', () => {
  it('7 dias seguidos e sono em dia', () => {
    const a = achievements(days(7).map((d) => log(d)), days(7).map((d) => check(d)), TODAY)
    expect(a.find((x) => x.id === 'strike7')?.done).toBe(true)
    expect(a.find((x) => x.id === 'sono5')?.done).toBe(true)
    // 7 horas de foco: ainda não chegou a 10
    const foco = a.find((x) => x.id === 'foco10')!
    expect(foco.done).toBe(false)
    expect(foco.progress).toBeCloseTo(0.7)
  })

  it('o recorde de strike vale mesmo se a sequência acabou', () => {
    const a = achievements([], days(7, 20).map((d) => check(d)), TODAY)
    expect(a.find((x) => x.id === 'strike7')?.done).toBe(true)
  })
})

describe('sleepWeek', () => {
  it('traz os 7 dias até hoje, com buraco onde não há registro', () => {
    const w = sleepWeek([log(0, { sleep_hours: 8 }), log(2, { sleep_hours: 6 })], TODAY)
    expect(w).toHaveLength(7)
    expect(w[6]).toEqual({ date: TODAY, hours: 8 })
    expect(w[5].hours).toBeNull()
    expect(w[4].hours).toBe(6)
  })
})
