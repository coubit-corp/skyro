import { describe, expect, it } from 'vitest'
import { evaluatePatient } from './alerts'
import type { DailyLog } from './database.types'
import { addDays } from './dates'

const TODAY = '2026-11-14'

/** Registro "bom" por padrão; cada teste muda só o que interessa. */
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
    created_at: '',
    updated_at: '',
    ...over,
  }
}

const week = (over: (i: number) => Partial<DailyLog> = () => ({})) =>
  Array.from({ length: 8 }, (_, i) => log(i, over(i)))

describe('evaluatePatient', () => {
  it('fica "em dia" quando tudo está bem', () => {
    const r = evaluatePatient(week(), TODAY)
    expect(r.status).toBe('em_dia')
    expect(r.alerts).toEqual([])
    expect(r.workoutsDone).toBe(7)
    expect(r.workoutsPlanned).toBe(7)
  })

  describe('sono', () => {
    it('alerta com menos de 6h na última noite', () => {
      const r = evaluatePatient(week((i) => (i === 0 ? { sleep_hours: 5.5 } : {})), TODAY)
      expect(r.status).toBe('atencao')
      expect(r.alerts).toEqual([{ kind: 'sono', message: 'Dormiu 5h30' }])
    })

    it('não alerta com exatamente 6h', () => {
      const r = evaluatePatient(week((i) => (i === 0 ? { sleep_hours: 6 } : {})), TODAY)
      expect(r.status).toBe('em_dia')
    })

    it('usa o registro de ontem se hoje ainda não tem', () => {
      const logs = week((i) => (i === 1 ? { sleep_hours: 4 } : {})).filter((l) => l.log_date !== TODAY)
      const r = evaluatePatient(logs, TODAY)
      expect(r.alerts.map((a) => a.kind)).toContain('sono')
      expect(r.lastSleep).toBe(4)
    })

    it('ignora noites ruins mais antigas que ontem', () => {
      const r = evaluatePatient(week((i) => (i === 3 ? { sleep_hours: 3 } : {})), TODAY)
      expect(r.status).toBe('em_dia')
    })
  })

  describe('treinos', () => {
    it('alerta com 2 treinos planejados perdidos na semana', () => {
      const r = evaluatePatient(week((i) => (i === 1 || i === 3 ? { workout_done: false } : {})), TODAY)
      expect(r.alerts).toEqual([{ kind: 'treino', message: 'Faltou a 2 treinos na semana' }])
      expect(r.workoutsDone).toBe(5)
    })

    it('não alerta com só 1 falta', () => {
      const r = evaluatePatient(week((i) => (i === 2 ? { workout_done: false } : {})), TODAY)
      expect(r.status).toBe('em_dia')
    })

    it('não conta o treino de hoje como falta (o dia não acabou)', () => {
      const r = evaluatePatient(week((i) => (i === 0 || i === 2 ? { workout_done: false } : {})), TODAY)
      expect(r.status).toBe('em_dia')
    })

    it('dia sem treino planejado não é falta', () => {
      const r = evaluatePatient(
        week((i) => (i === 1 || i === 2 ? { workout_planned: false, workout_done: false } : {})),
        TODAY,
      )
      expect(r.status).toBe('em_dia')
      expect(r.workoutsPlanned).toBe(5)
    })

    it('não olha além de 7 dias', () => {
      const r = evaluatePatient(week((i) => (i === 7 ? { workout_done: false } : {})).concat(log(9, { workout_done: false })), TODAY)
      expect(r.alerts.map((a) => a.kind)).not.toContain('treino')
    })
  })

  describe('água', () => {
    it('alerta com menos de 50% da meta ontem', () => {
      const r = evaluatePatient(week((i) => (i === 1 ? { water_liters: 0.8 } : {})), TODAY)
      expect(r.alerts).toEqual([{ kind: 'agua', message: 'Água: 0,8 L de 2 L' }])
    })

    it('não alerta com exatamente 50%', () => {
      const r = evaluatePatient(week((i) => (i === 1 ? { water_liters: 1 } : {})), TODAY)
      expect(r.status).toBe('em_dia')
    })

    it('respeita a meta de cada pessoa', () => {
      const r = evaluatePatient(week((i) => (i === 1 ? { water_liters: 1.4, water_goal_liters: 3 } : {})), TODAY)
      expect(r.alerts.map((a) => a.kind)).toEqual(['agua'])
    })

    it('olha só ontem (hoje ainda está acontecendo)', () => {
      const r = evaluatePatient(week((i) => (i === 0 ? { water_liters: 0.2 } : {})), TODAY)
      expect(r.status).toBe('em_dia')
    })
  })

  describe('sem registro', () => {
    it('não alerta se registrou ontem mas não hoje', () => {
      const r = evaluatePatient(week().filter((l) => l.log_date !== TODAY), TODAY)
      expect(r.status).toBe('em_dia')
      expect(r.daysSinceLastLog).toBe(1)
    })

    it('alerta sem registro há 2 dias', () => {
      const r = evaluatePatient([log(2), log(3), log(4)], TODAY)
      expect(r.alerts.map((a) => a.kind)).toContain('sem_registro')
      expect(r.alerts.find((a) => a.kind === 'sem_registro')?.message).toBe('Sem registro há 2 dias')
    })

    it('alerta quem nunca registrou', () => {
      const r = evaluatePatient([], TODAY)
      expect(r.status).toBe('atencao')
      expect(r.alerts).toEqual([{ kind: 'sem_registro', message: 'Nenhum registro ainda' }])
      expect(r.lastSleep).toBeNull()
    })
  })

  it('junta vários alertas (cenário do Lucas na demo)', () => {
    // hoje 5h30; faltou ontem e há 3 dias; água ok
    const r = evaluatePatient(
      week((i) => ({
        ...(i === 0 ? { sleep_hours: 5.5, workout_done: false } : {}),
        ...(i === 1 || i === 3 ? { workout_done: false } : {}),
        ...(i === 1 ? { water_liters: 1.6 } : {}),
      })),
      TODAY,
    )
    expect(r.status).toBe('atencao')
    expect(r.alerts.map((a) => a.kind)).toEqual(['sono', 'treino'])
  })
})
