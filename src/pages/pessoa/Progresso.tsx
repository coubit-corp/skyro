import { ArrowDown, ArrowRight, ArrowUp, ChevronRight, Flame } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { DemoBanner } from '../../components/DemoBanner'
import { ErrorState, PageHeader, Skeleton } from '../../components/ui'
import { useDailyLogs, useHabitChecks } from '../../hooks/usePersonData'
import { formatHours, today, weekdayShort } from '../../lib/dates'
import {
  achievements,
  computeXp,
  GOOD_SLEEP_HOURS,
  levelFor,
  sleepWeek,
  weekReport,
  XP_RULES,
  XP_WINDOW_DAYS,
} from '../../lib/progress'
import { currentStreak } from '../../lib/streak'

const xpFormat = new Intl.NumberFormat('pt-BR')

export function Progresso() {
  const todayIso = today()
  const logs = useDailyLogs(XP_WINDOW_DAYS)
  const checks = useHabitChecks(XP_WINDOW_DAYS)

  const data = useMemo(() => {
    if (!logs.data || !checks.data) return null
    const xp = computeXp(logs.data, checks.data, todayIso)
    return {
      xp,
      level: levelFor(xp),
      report: weekReport(logs.data, checks.data, todayIso),
      badges: achievements(logs.data, checks.data, todayIso),
      sleep: sleepWeek(logs.data, todayIso),
      streak: currentStreak(new Set(checks.data.map((c) => c.check_date)), todayIso),
    }
  }, [logs.data, checks.data, todayIso])

  if (logs.error || checks.error) {
    return (
      <ErrorState
        message={(logs.error ?? checks.error)?.message}
        onRetry={() => {
          logs.refetch()
          checks.refetch()
        }}
      />
    )
  }

  return (
    <section className="space-y-4">
      <PageHeader title="Seu progresso" subtitle={`Calculado a partir dos seus registros dos últimos ${XP_WINDOW_DAYS} dias.`} />

      {!data ? (
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-32" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-36" />
          <Skeleton className="h-44" />
        </div>
      ) : (
        <>
          {/* XP e nível */}
          <div className="rounded-card bg-navy p-5 text-white">
            <p className="text-xs font-semibold tracking-[0.12em] text-lavender uppercase">Seu XP</p>
            <p className="mt-1 font-display text-4xl font-extrabold">{xpFormat.format(data.xp)} XP</p>
            <p className="mt-1 text-sm text-white/80">
              Nível {data.level.current.name}
              {data.level.next
                ? ` · faltam ${xpFormat.format(data.level.missing)} para o ${data.level.next.name}`
                : ' · nível máximo'}
            </p>
            <div
              className="mt-4 h-2 rounded-full bg-white/15"
              role="progressbar"
              aria-label={data.level.next ? `Progresso até o nível ${data.level.next.name}` : 'Nível máximo'}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(data.level.progress * 100)}
            >
              <div className="h-2 rounded-full bg-lavender" style={{ width: `${Math.round(data.level.progress * 100)}%` }} />
            </div>
          </div>

          {/* Score e strike */}
          <div className="grid grid-cols-2 gap-3">
            <Link to="/progresso/semana" className="card block transition hover:ring-2 hover:ring-lavender">
              <p className="eyebrow">Resumo da semana</p>
              <p className="mt-1 flex items-center gap-1 font-display text-2xl font-bold">
                {data.report.current.score == null ? '—' : `Score ${data.report.current.score}`}
                <ScoreTrend now={data.report.current.score} before={data.report.previous.score} />
              </p>
              <p className="mt-1 flex items-center gap-0.5 text-xs font-semibold text-primary">
                Ver resumo <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </p>
            </Link>
            <div className="card">
              <p className="eyebrow">Strike</p>
              <p className="mt-1 flex items-center gap-1.5 font-display text-2xl font-bold">
                <Flame className="h-5 w-5 text-gold" aria-hidden="true" />
                {data.streak} {data.streak === 1 ? 'dia' : 'dias'}
              </p>
              <p className="mt-1 text-xs text-muted">seguidos com hábito marcado</p>
            </div>
          </div>

          {/* Conquistas */}
          <div className="card">
            <h2 className="eyebrow mb-3">Conquistas</h2>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {data.badges.map((b) => (
                <li key={b.id} className="flex flex-col items-center text-center" title={b.hint}>
                  <span
                    className={`flex h-14 w-14 items-center justify-center rounded-full font-display text-lg font-bold ${
                      b.done ? 'bg-primary text-white' : 'bg-lavender-soft text-ink'
                    }`}
                  >
                    {b.badge}
                  </span>
                  <span className="mt-2 text-xs font-semibold">{b.title}</span>
                  <span className="text-[11px] text-muted">
                    {b.done ? 'Conquistada' : `${Math.round(b.progress * 100)}%`}
                  </span>
                  {!b.done && <span className="sr-only">{b.hint}</span>}
                </li>
              ))}
            </ul>
          </div>

          {/* Sono na semana */}
          <SleepChart days={data.sleep} />

          <details className="card text-sm">
            <summary className="tap cursor-pointer font-semibold text-primary">Como ganhar XP</summary>
            <ul className="mt-2 space-y-1 text-muted">
              <li>+{XP_RULES.habitCheck} XP por hábito marcado</li>
              <li>+{XP_RULES.dailyLog} XP por dia registrado na Rotina</li>
              <li>+{XP_RULES.workoutDone} XP por treino feito</li>
              <li>+{XP_RULES.waterGoal} XP por dia com a meta de água batida</li>
              <li>
                +{XP_RULES.goodSleep} XP por noite com {GOOD_SLEEP_HOURS}h ou mais de sono
              </li>
            </ul>
            <p className="mt-2 text-xs text-muted">Contam os últimos {XP_WINDOW_DAYS} dias. Liga e Loja Skyro chegam numa próxima versão.</p>
          </details>
        </>
      )}

      <DemoBanner />
    </section>
  )
}

function ScoreTrend({ now, before }: { now: number | null; before: number | null }) {
  if (now == null || before == null) return null
  if (now > before) return <ArrowUp className="h-5 w-5 text-primary" aria-label={`subiu de ${before}`} />
  if (now < before) return <ArrowDown className="h-5 w-5 text-attention" aria-label={`caiu de ${before}`} />
  return <ArrowRight className="h-5 w-5 text-muted" aria-label="igual à semana anterior" />
}

const MAX_BAR_HOURS = 10

function SleepChart({ days }: { days: { date: string; hours: number | null }[] }) {
  const logged = days.flatMap((d) => (d.hours != null ? [d.hours] : []))
  const average = logged.length ? logged.reduce((a, b) => a + b, 0) / logged.length : null

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="eyebrow">Sono na semana</h2>
        <span className="text-xs text-muted">
          {average == null ? 'sem registros' : `média ${formatHours(Math.round(average * 6) / 6)}`}
        </span>
      </div>
      <ul className="flex h-36 items-end gap-2" aria-label="Horas de sono nos últimos 7 dias">
        {days.map((d) => {
          const good = d.hours != null && d.hours >= GOOD_SLEEP_HOURS
          const label = `${weekdayShort(d.date)}: ${d.hours == null ? 'sem registro' : formatHours(d.hours)}`
          return (
            <li key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={label}>
              <span className="sr-only">{label}</span>
              {d.hours == null ? (
                <span className="h-3 w-full rounded-lg border border-dashed border-lavender" aria-hidden="true" />
              ) : (
                <span
                  aria-hidden="true"
                  className={`w-full rounded-lg ${good ? 'bg-primary' : 'bg-lavender'}`}
                  style={{ height: `${Math.max(8, Math.min(d.hours / MAX_BAR_HOURS, 1) * 100)}%` }}
                />
              )}
              <span className="text-[11px] text-muted" aria-hidden="true">
                {weekdayShort(d.date)[0]}
              </span>
            </li>
          )
        })}
      </ul>
      <p className="mt-3 flex items-center gap-3 text-[11px] text-muted">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary" aria-hidden="true" /> {GOOD_SLEEP_HOURS}h ou mais
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-lavender" aria-hidden="true" /> menos de {GOOD_SLEEP_HOURS}h
        </span>
      </p>
    </div>
  )
}
