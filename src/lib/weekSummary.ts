// Resumo da semana para o profissional, montado por regras (sem IA).
// É o plano B: quando a IA estiver ligada, ela escreve o texto; sem chave,
// ou se a IA falhar, este resumo aparece no lugar, e a demo nunca quebra.

import type { PatientStatus } from './alerts'
import type { DailyLog } from './database.types'
import { addDays, formatHours } from './dates'

export interface WeekSummary {
  lines: string[]
  attention: string
}

function avg(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
}

/** Últimos 7 dias (hoje incluso) comparados com os 7 anteriores. */
export function buildWeekSummary(logs: DailyLog[], evaluation: PatientStatus, todayIso: string): WeekSummary {
  const inRange = (from: number, to: number) =>
    logs.filter((l) => l.log_date <= addDays(todayIso, -from) && l.log_date >= addDays(todayIso, -to))
  const week = inRange(0, 6)
  const prev = inRange(7, 13)
  const lines: string[] = []

  if (week.length === 0) {
    return { lines: ['Nenhum registro nos últimos 7 dias.'], attention: 'Vale um contato para entender o que aconteceu.' }
  }

  // Sono
  const sleepNow = avg(week.flatMap((l) => (l.sleep_hours != null ? [l.sleep_hours] : [])))
  const sleepPrev = avg(prev.flatMap((l) => (l.sleep_hours != null ? [l.sleep_hours] : [])))
  if (sleepNow != null) {
    let line = `Dormiu em média ${formatHours(Math.round(sleepNow * 6) / 6)} por noite`
    if (sleepPrev != null && Math.abs(sleepNow - sleepPrev) >= 0.25) {
      line += sleepNow < sleepPrev ? `, menos que na semana anterior (${formatHours(Math.round(sleepPrev * 6) / 6)})` : `, mais que na semana anterior (${formatHours(Math.round(sleepPrev * 6) / 6)})`
    }
    lines.push(line + '.')
  }

  // Treinos
  if (evaluation.workoutsPlanned > 0) {
    lines.push(`Treinou ${evaluation.workoutsDone} de ${evaluation.workoutsPlanned} vezes planejadas.`)
  }

  // Padrão sono × treino
  const pastWeek = week.filter((l) => l.log_date < todayIso && l.workout_planned)
  const shortNights = pastWeek.filter((l) => l.sleep_hours != null && l.sleep_hours < 6.5)
  const missedAfterShort = shortNights.filter((l) => !l.workout_done).length
  if (shortNights.length >= 2 && missedAfterShort >= 2) {
    lines.push(`Nos dias em que dormiu menos de 6h30, faltou a ${missedAfterShort} de ${shortNights.length} treinos.`)
  }

  // Água
  const waterDays = week.filter((l) => l.log_date < todayIso && l.water_liters != null)
  if (waterDays.length > 0) {
    const hit = waterDays.filter((l) => l.water_liters! >= l.water_goal_liters).length
    lines.push(`Bateu a meta de água em ${hit} de ${waterDays.length} dias.`)
  }

  const attention = evaluation.alerts.length
    ? `Ponto de atenção: ${evaluation.alerts.map((a) => a.message.charAt(0).toLowerCase() + a.message.slice(1)).join('; ')}.`
    : 'Nada fora do comum nesta semana.'

  return { lines: lines.slice(0, 4), attention }
}
