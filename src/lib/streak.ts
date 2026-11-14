import { addDays } from './dates'

/**
 * Strike: dias seguidos com pelo menos um hábito marcado.
 * Se hoje ainda não tem marcação, conta a partir de ontem (o dia não acabou).
 */
export function currentStreak(daysWithChecks: Set<string>, todayIso: string): number {
  let day = daysWithChecks.has(todayIso) ? todayIso : addDays(todayIso, -1)
  let count = 0
  while (daysWithChecks.has(day)) {
    count++
    day = addDays(day, -1)
  }
  return count
}

/** Maior sequência de dias seguidos dentro do conjunto. */
export function bestStreak(daysWithChecks: Set<string>): number {
  let best = 0
  for (const day of daysWithChecks) {
    if (daysWithChecks.has(addDays(day, -1))) continue // não é início de sequência
    let len = 0
    let d = day
    while (daysWithChecks.has(d)) {
      len++
      d = addDays(d, 1)
    }
    best = Math.max(best, len)
  }
  return best
}
