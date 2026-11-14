// Regras de alerta do painel do profissional (especificação, seção 6).
// São determinísticas de propósito: a IA NÃO decide quem está em "Atenção",
// ela só escreve o resumo. Assim o comportamento é previsível e explicável.

import type { DailyLog } from './database.types'
import { addDays } from './dates'

export const RULES = {
  /** dormiu menos que isso na última noite */
  minSleepHours: 6,
  /** perdeu esta quantidade (ou mais) de treinos planejados nos últimos 7 dias */
  maxMissedWorkouts: 2,
  /** bebeu menos que esta fração da meta ontem */
  minWaterRatio: 0.5,
  /** está sem registrar há esta quantidade de dias (ou mais) */
  maxDaysWithoutLog: 2,
} as const

export type AlertKind = 'sono' | 'treino' | 'agua' | 'sem_registro'

export interface Alert {
  kind: AlertKind
  /** frase curta para a lista de pacientes e a ficha */
  message: string
}

export interface PatientStatus {
  status: 'atencao' | 'em_dia'
  alerts: Alert[]
  /** última noite de sono registrada (hoje ou ontem) */
  lastSleep: number | null
  /** treinos feitos / planejados nos últimos 7 dias (sem contar hoje) */
  workoutsDone: number
  workoutsPlanned: number
  /** dias desde o último registro (0 = registrou hoje; null = nunca) */
  daysSinceLastLog: number | null
}

function daysBetween(fromIso: string, toIso: string): number {
  const [a, b] = [fromIso, toIso].map((d) => new Date(`${d}T12:00:00`).getTime())
  return Math.round((b - a) / 86_400_000)
}

/**
 * Calcula a situação do paciente a partir dos registros diários.
 * `todayIso` vem de fora para o cálculo ser testável e usar o fuso do aparelho.
 */
export function evaluatePatient(logs: DailyLog[], todayIso: string): PatientStatus {
  const byDate = new Map(logs.map((l) => [l.log_date, l]))
  const yesterday = addDays(todayIso, -1)
  const alerts: Alert[] = []

  // 1. Sono da última noite: o registro de hoje; se ainda não houver, o de ontem.
  const lastNight = byDate.get(todayIso) ?? byDate.get(yesterday)
  const lastSleep = lastNight?.sleep_hours ?? null
  if (lastSleep != null && lastSleep < RULES.minSleepHours) {
    alerts.push({ kind: 'sono', message: `Dormiu ${formatSleep(lastSleep)}` })
  }

  // 2. Treinos dos últimos 7 dias, sem contar hoje (o treino de hoje ainda pode acontecer).
  let planned = 0
  let done = 0
  let missed = 0
  for (let i = 1; i <= 7; i++) {
    const log = byDate.get(addDays(todayIso, -i))
    if (!log?.workout_planned) continue
    planned++
    if (log.workout_done) done++
    else missed++
  }
  if (missed >= RULES.maxMissedWorkouts) {
    alerts.push({ kind: 'treino', message: `Faltou a ${missed} treinos na semana` })
  }

  // 3. Água de ontem abaixo de 50% da meta.
  const y = byDate.get(yesterday)
  if (y?.water_liters != null && y.water_liters < y.water_goal_liters * RULES.minWaterRatio) {
    alerts.push({
      kind: 'agua',
      message: `Água: ${formatLiters(y.water_liters)} de ${formatLiters(y.water_goal_liters)}`,
    })
  }

  // 4. Sem registro há 2 dias ou mais.
  const lastDate = logs.reduce<string | null>((max, l) => (max == null || l.log_date > max ? l.log_date : max), null)
  const daysSinceLastLog = lastDate ? daysBetween(lastDate, todayIso) : null
  if (daysSinceLastLog == null || daysSinceLastLog >= RULES.maxDaysWithoutLog) {
    alerts.push({
      kind: 'sem_registro',
      message: daysSinceLastLog == null ? 'Nenhum registro ainda' : `Sem registro há ${daysSinceLastLog} dias`,
    })
  }

  return {
    status: alerts.length > 0 ? 'atencao' : 'em_dia',
    alerts,
    lastSleep,
    workoutsDone: done,
    workoutsPlanned: planned,
    daysSinceLastLog,
  }
}

function formatSleep(h: number): string {
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return mm ? `${hh}h${String(mm).padStart(2, '0')}` : `${hh}h`
}

function formatLiters(l: number): string {
  return `${l.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L`
}
