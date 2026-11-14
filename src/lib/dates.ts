// Datas sempre no fuso do aparelho. Nunca use toISOString() para "hoje":
// ele converte para UTC e, à noite no Brasil, já vira o dia seguinte.

/** "2026-11-13" no horário local */
export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Converte "2026-11-13" em Date ao meio-dia local (evita pular de dia com horário de verão). */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

export function today(): string {
  return toISODate(new Date())
}

export function addDays(iso: string, days: number): string {
  const d = fromISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

/** Segunda a domingo da semana que contém a data. */
export function weekOf(iso: string): string[] {
  const d = fromISODate(iso)
  const mondayOffset = (d.getDay() + 6) % 7
  const monday = addDays(iso, -mondayOffset)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function weekdayShort(iso: string): string {
  return WEEKDAY_SHORT[fromISODate(iso).getDay()]
}

export function dayOfMonth(iso: string): number {
  return fromISODate(iso).getDate()
}

/** "13 de novembro" */
export function longDate(iso: string): string {
  return fromISODate(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
}

/**
 * Data e hora de um instante salvo pelo banco (timestamptz), sempre no horário
 * de Brasília: "14/11 às 22:30". Para "hoje", use today().
 */
export function formatDateTimeBR(timestamp: string): string {
  const d = new Date(timestamp)
  const date = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })
  const time = d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
  return `${date} às ${time}`
}

/** 7.5 → "7h30" ; 7 → "7h" */
export function formatHours(hours: number | null | undefined): string {
  if (hours == null) return '—'
  const h = Math.floor(hours)
  const min = Math.round((hours - h) * 60)
  return min === 0 ? `${h}h` : `${h}h${String(min).padStart(2, '0')}`
}

/** 100 → "1h 40min" ; 40 → "40min" */
export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes == null) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

/** "07:00:00" (Postgres) → "07:00" */
export function formatTime(time: string | null): string | null {
  return time ? time.slice(0, 5) : null
}
