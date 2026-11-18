// Regras da aba Progresso: XP, nível, Skyro Score, conquistas e resumo da semana.
// Tudo é calculado a partir dos registros da própria pessoa, com regras fixas e
// explicáveis (nenhuma IA e nenhuma tabela nova). As regras ficam aqui, puras,
// para serem testadas sem banco.

import type { DailyLog } from './database.types'
import { addDays } from './dates'
import { bestStreak, currentStreak } from './streak'

/** Quantos dias de histórico entram na conta de XP. */
export const XP_WINDOW_DAYS = 60

/** Pontos de XP por ação. Mostrados na tela em "Como ganhar XP". */
export const XP_RULES = {
  habitCheck: 10,
  dailyLog: 20,
  workoutDone: 30,
  waterGoal: 10,
  goodSleep: 10,
} as const

/** Noite boa para XP, Score e conquistas. */
export const GOOD_SLEEP_HOURS = 7

export interface Level {
  name: string
  min: number
}

export const LEVELS: Level[] = [
  { name: 'Bronze', min: 0 },
  { name: 'Prata', min: 500 },
  { name: 'Ouro', min: 1500 },
  { name: 'Diamante', min: 3000 },
]

export interface HabitCheckRow {
  habit_id: string
  check_date: string
}

function inWindow(iso: string, fromIso: string, toIso: string): boolean {
  return iso >= fromIso && iso <= toIso
}

/** XP dos últimos `XP_WINDOW_DAYS` dias (hoje incluso). */
export function computeXp(logs: DailyLog[], checks: HabitCheckRow[], todayIso: string): number {
  const from = addDays(todayIso, -(XP_WINDOW_DAYS - 1))
  let xp = 0
  for (const c of checks) {
    if (inWindow(c.check_date, from, todayIso)) xp += XP_RULES.habitCheck
  }
  for (const l of logs) {
    if (!inWindow(l.log_date, from, todayIso)) continue
    xp += XP_RULES.dailyLog
    if (l.workout_done) xp += XP_RULES.workoutDone
    if (l.water_liters != null && l.water_goal_liters > 0 && l.water_liters >= l.water_goal_liters) {
      xp += XP_RULES.waterGoal
    }
    if (l.sleep_hours != null && l.sleep_hours >= GOOD_SLEEP_HOURS) xp += XP_RULES.goodSleep
  }
  return xp
}

export interface LevelInfo {
  current: Level
  next: Level | null
  /** XP que falta para o próximo nível (0 no último). */
  missing: number
  /** 0 a 1: quanto do caminho até o próximo nível já foi feito. */
  progress: number
}

export function levelFor(xp: number): LevelInfo {
  let index = 0
  LEVELS.forEach((l, i) => {
    if (xp >= l.min) index = i
  })
  const current = LEVELS[index]
  const next = LEVELS[index + 1] ?? null
  if (!next) return { current, next, missing: 0, progress: 1 }
  return {
    current,
    next,
    missing: next.min - xp,
    progress: (xp - current.min) / (next.min - current.min),
  }
}

// ------------------------------------------------------------------- semana

export interface WeekStats {
  /** primeiro e último dia do período (YYYY-MM-DD) */
  from: string
  to: string
  workoutsDone: number
  workoutsPlanned: number
  /** média das noites registradas, em horas */
  avgSleep: number | null
  focusMinutes: number
  /** dias em que bateu a meta de água / dias com registro de água */
  waterDays: number
  waterLogged: number
  /** dias com algum registro (registro do dia ou hábito marcado) */
  activeDays: number
  /** 0 a 100, ou null se não há nada registrado */
  score: number | null
  /** cada parte do Score, de 0 a 1 (null quando não há dado) */
  parts: Record<ScorePart, number | null>
}

export type ScorePart = 'sono' | 'treino' | 'agua' | 'constancia'

export const SCORE_PART_LABEL: Record<ScorePart, string> = {
  sono: 'Sono',
  treino: 'Treinos',
  agua: 'Hidratação',
  constancia: 'Constância',
}

function mean(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
}

/**
 * Números de 7 dias que terminam em `endIso` (incluso).
 * O Skyro Score é a média das partes que têm dado:
 * - sono: cada noite vale até 1 (7h ou mais = 1);
 * - treino: treinos feitos ÷ planejados;
 * - água: cada dia vale até 1 (meta batida = 1);
 * - constância: dias com algum registro ÷ 7.
 * Sem nenhum registro do dia na semana, não há Score.
 */
export function weekStats(logs: DailyLog[], checks: HabitCheckRow[], endIso: string): WeekStats {
  const from = addDays(endIso, -6)
  const week = logs.filter((l) => inWindow(l.log_date, from, endIso))
  const checkDays = new Set(checks.filter((c) => inWindow(c.check_date, from, endIso)).map((c) => c.check_date))
  const activeDays = new Set([...week.map((l) => l.log_date), ...checkDays]).size

  const sleeps = week.flatMap((l) => (l.sleep_hours != null ? [l.sleep_hours] : []))
  const planned = week.filter((l) => l.workout_planned)
  const workoutsDone = week.filter((l) => l.workout_done).length
  const water = week.filter((l) => l.water_liters != null && l.water_goal_liters > 0)

  const parts: Record<ScorePart, number | null> = {
    sono: mean(sleeps.map((h) => Math.min(h / GOOD_SLEEP_HOURS, 1))),
    treino: planned.length ? Math.min(planned.filter((l) => l.workout_done).length / planned.length, 1) : null,
    agua: mean(water.map((l) => Math.min(l.water_liters! / l.water_goal_liters, 1))),
    constancia: activeDays / 7,
  }
  const available = Object.values(parts).filter((p): p is number => p != null)
  // Sem nenhum registro do dia não há Score: só hábitos marcados dariam 100 só pela constância.
  const score = week.length === 0 ? null : Math.round(100 * (mean(available) ?? 0))

  return {
    from,
    to: endIso,
    workoutsDone,
    workoutsPlanned: planned.length,
    avgSleep: mean(sleeps),
    focusMinutes: week.reduce((sum, l) => sum + (l.focus_minutes ?? 0), 0),
    waterDays: water.filter((l) => l.water_liters! >= l.water_goal_liters).length,
    waterLogged: water.length,
    activeDays,
    score,
    parts,
  }
}

export interface WeekReport {
  current: WeekStats
  previous: WeekStats
  /** melhor e pior parte do Score, comparando com a semana anterior quando dá */
  best: { part: ScorePart; text: string } | null
  improve: { part: ScorePart; text: string } | null
}

const IMPROVE_TIP: Record<ScorePart, string> = {
  sono: 'Tente deitar 30 minutos mais cedo nos dias de treino.',
  treino: 'Escolha um horário fixo para os treinos que costumam ficar para trás.',
  agua: 'Deixe uma garrafa à vista e registre a água ao longo do dia.',
  constancia: 'Registrar todo dia, mesmo que rápido, ajuda seus profissionais a acompanhar você.',
}

/** Semana atual = últimos 7 dias (hoje incluso); anterior = os 7 dias antes dela. */
export function weekReport(logs: DailyLog[], checks: HabitCheckRow[], todayIso: string): WeekReport {
  const current = weekStats(logs, checks, todayIso)
  const previous = weekStats(logs, checks, addDays(todayIso, -7))

  const parts = (Object.keys(current.parts) as ScorePart[]).filter((p) => current.parts[p] != null)
  let best: WeekReport['best'] = null
  let improve: WeekReport['improve'] = null

  if (current.score != null && parts.length) {
    // Melhor resultado: a parte que mais subiu; sem semana anterior, a mais alta.
    const delta = (p: ScorePart) =>
      previous.parts[p] != null ? current.parts[p]! - previous.parts[p]! : Number.NEGATIVE_INFINITY
    const rising = parts.filter((p) => delta(p) > 0.005).sort((a, b) => delta(b) - delta(a))
    if (rising.length) {
      const p = rising[0]
      best = { part: p, text: `+${Math.round(delta(p) * 100)}% em ${SCORE_PART_LABEL[p].toLowerCase()}` }
    } else {
      const p = [...parts].sort((a, b) => current.parts[b]! - current.parts[a]!)[0]
      best = { part: p, text: `${Math.round(current.parts[p]! * 100)}% em ${SCORE_PART_LABEL[p].toLowerCase()}` }
    }

    // Para melhorar: a parte mais baixa, se ainda não estiver perto do máximo.
    const low = [...parts].sort((a, b) => current.parts[a]! - current.parts[b]!)[0]
    if (current.parts[low]! < 0.9 && low !== best.part) {
      improve = { part: low, text: IMPROVE_TIP[low] }
    }
  }

  return { current, previous, best, improve }
}

// --------------------------------------------------------------- conquistas

export interface Achievement {
  id: string
  title: string
  /** texto curto dentro do círculo */
  badge: string
  done: boolean
  /** 0 a 1 */
  progress: number
  /** como conquistar */
  hint: string
}

export function achievements(logs: DailyLog[], checks: HabitCheckRow[], todayIso: string): Achievement[] {
  const days = new Set(checks.map((c) => c.check_date))
  const record = Math.max(bestStreak(days), currentStreak(days, todayIso))

  const week = logs.filter((l) => inWindow(l.log_date, addDays(todayIso, -6), todayIso))
  const goodNights = week.filter((l) => l.sleep_hours != null && l.sleep_hours >= GOOD_SLEEP_HOURS).length

  const monthFrom = addDays(todayIso, -29)
  const focusHours = logs
    .filter((l) => inWindow(l.log_date, monthFrom, todayIso))
    .reduce((sum, l) => sum + (l.focus_minutes ?? 0), 0) / 60

  const workouts = logs.filter((l) => inWindow(l.log_date, monthFrom, todayIso) && l.workout_done).length

  const make = (a: Omit<Achievement, 'done' | 'progress'>, value: number, goal: number): Achievement => ({
    ...a,
    done: value >= goal,
    progress: Math.min(value / goal, 1),
  })

  return [
    make({ id: 'strike7', title: '7 dias seguidos', badge: '7', hint: 'Marque um hábito 7 dias seguidos.' }, record, 7),
    make(
      { id: 'sono5', title: 'Sono em dia', badge: `${GOOD_SLEEP_HOURS}h`, hint: `Durma ${GOOD_SLEEP_HOURS}h ou mais em 5 noites da semana.` },
      goodNights,
      5,
    ),
    make({ id: 'foco10', title: '10 h de foco', badge: '10', hint: 'Some 10 horas de foco em 30 dias.' }, focusHours, 10),
    make({ id: 'treino12', title: '12 treinos', badge: '12', hint: 'Faça 12 treinos em 30 dias.' }, workouts, 12),
  ]
}

/** Horas de sono de cada um dos 7 dias que terminam hoje (null = sem registro). */
export function sleepWeek(logs: DailyLog[], todayIso: string): { date: string; hours: number | null }[] {
  const byDate = new Map(logs.map((l) => [l.log_date, l.sleep_hours]))
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(todayIso, i - 6)
    return { date, hours: byDate.get(date) ?? null }
  })
}
