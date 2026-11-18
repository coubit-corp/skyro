import { ChevronLeft, Clock, Droplet, Dumbbell, Flame, Lightbulb, Moon, TrendingUp, type LucideIcon } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { DemoBanner } from '../../components/DemoBanner'
import { ErrorState, Skeleton } from '../../components/ui'
import { useDailyLogs, useHabitChecks } from '../../hooks/usePersonData'
import { fromISODate, formatHours, formatMinutes, today } from '../../lib/dates'
import { SCORE_PART_LABEL, weekReport, type ScorePart } from '../../lib/progress'
import { currentStreak } from '../../lib/streak'

/** "8 a 14 de novembro" ou "28 de outubro a 3 de novembro" */
function rangeLabel(fromIso: string, toIso: string): string {
  const a = fromISODate(fromIso)
  const b = fromISODate(toIso)
  const month = (d: Date) => d.toLocaleDateString('pt-BR', { month: 'long' })
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()} a ${b.getDate()} de ${month(b)}`
    : `${a.getDate()} de ${month(a)} a ${b.getDate()} de ${month(b)}`
}

export function ResumoSemana() {
  const todayIso = today()
  // 14 dias: a semana atual e a anterior, para comparar.
  const logs = useDailyLogs(14)
  const checks = useHabitChecks(60)

  const data = useMemo(() => {
    if (!logs.data || !checks.data) return null
    return {
      report: weekReport(logs.data, checks.data, todayIso),
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

  const week = data?.report.current
  const prev = data?.report.previous

  return (
    <section className="space-y-4">
      <div className="rounded-card bg-navy p-5 text-white">
        <Link to="/progresso" className="tap gap-1 text-sm font-semibold text-white">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Progresso
        </Link>
        <p className="mt-2 text-xs font-semibold tracking-[0.12em] text-lavender uppercase">
          {week ? rangeLabel(week.from, week.to) : 'Últimos 7 dias'}
        </p>
        <h1 className="mt-1 text-[28px] leading-tight font-bold">Seu resumo da semana</h1>

        {!data ? (
          <Skeleton className="mt-4 h-28 bg-white/10" />
        ) : (
          <div className="mt-4 flex items-center gap-4 rounded-card bg-navy-soft p-4">
            <ScoreRing score={week!.score} />
            <div>
              <p className="text-sm text-white/80">Skyro Score</p>
              <p className="font-display text-2xl font-bold">
                {week!.score == null
                  ? 'Sem registros'
                  : prev!.score == null
                    ? week!.score
                    : `${prev!.score} → ${week!.score}`}
              </p>
              <p className="text-xs text-white/80">{scoreDelta(week!.score, prev!.score)}</p>
            </div>
          </div>
        )}
      </div>

      {!data ? (
        <Skeleton className="h-72" />
      ) : (
        <>
          <div className="card">
            <h2 className="eyebrow mb-1">Você fez</h2>
            <ul className="divide-y divide-line">
              <Row
                icon={Dumbbell}
                label="Treinos"
                value={week!.workoutsPlanned ? `${week!.workoutsDone}/${week!.workoutsPlanned}` : String(week!.workoutsDone)}
              />
              <Row icon={Moon} label="Média de sono" value={formatHours(week!.avgSleep == null ? null : Math.round(week!.avgSleep * 6) / 6)} />
              <Row icon={Clock} label="Tempo de foco" value={formatMinutes(week!.focusMinutes)} />
              <Row icon={Droplet} label="Dias com a meta de água" value={`${week!.waterDays}/7`} />
              <Row icon={Flame} label="Strike" value={`${data.streak} ${data.streak === 1 ? 'dia' : 'dias'}`} />
            </ul>
          </div>

          {data.report.best && (
            <Highlight icon={TrendingUp} title="Seu melhor resultado" text={data.report.best.text} />
          )}
          {data.report.improve && (
            <Highlight
              icon={Lightbulb}
              title={`Para melhorar: ${SCORE_PART_LABEL[data.report.improve.part].toLowerCase()}`}
              text={data.report.improve.text}
              soft
            />
          )}

          <details className="card text-sm">
            <summary className="tap cursor-pointer font-semibold text-primary">Como o Score é calculado</summary>
            <p className="mt-2 text-muted">
              É a média, de 0 a 100, das partes que você registrou nos últimos 7 dias:
            </p>
            <ul className="mt-2 space-y-1 text-muted">
              {(Object.keys(SCORE_PART_LABEL) as ScorePart[]).map((p) => (
                <li key={p} className="flex justify-between gap-3">
                  <span>{PART_RULE[p]}</span>
                  <span className="font-semibold text-ink">
                    {week!.parts[p] == null ? '—' : `${Math.round(week!.parts[p]! * 100)}%`}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">São regras fixas, sem IA. O Score não é uma avaliação de saúde.</p>
          </details>
        </>
      )}

      <DemoBanner />
    </section>
  )
}

const PART_RULE: Record<ScorePart, string> = {
  sono: 'Sono: noites de 7h ou mais',
  treino: 'Treinos: feitos ÷ planejados',
  agua: 'Hidratação: meta de água do dia',
  constancia: 'Constância: dias com registro ÷ 7',
}

function scoreDelta(now: number | null, before: number | null): string {
  if (now == null) return 'Registre sua rotina para ver o Score.'
  if (before == null) return 'Primeira semana com registros.'
  const diff = now - before
  if (diff === 0) return 'Igual à semana passada.'
  return `${diff > 0 ? '+' : '−'}${Math.abs(diff)} ${Math.abs(diff) === 1 ? 'ponto' : 'pontos'} em relação à semana passada`
}

function ScoreRing({ score }: { score: number | null }) {
  const r = 26
  const c = 2 * Math.PI * r
  const value = score ?? 0
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16 shrink-0" role="img" aria-label={score == null ? 'Sem Score' : `Score ${score} de 100`}>
      <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-white/15" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value / 100)}
        transform="rotate(-90 32 32)"
        className="text-lavender"
      />
      <text x="32" y="37" textAnchor="middle" className="fill-white font-display text-[15px] font-bold">
        {score ?? '—'}
      </text>
    </svg>
  )
}

function Row({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lavender-soft text-primary">
        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
      </span>
      <span className="flex-1 text-sm">{label}</span>
      <span className="font-display text-lg font-bold">{value}</span>
    </li>
  )
}

function Highlight({ icon: Icon, title, text, soft }: { icon: LucideIcon; title: string; text: string; soft?: boolean }) {
  return (
    <div className="card flex items-start gap-3">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          soft ? 'bg-attention-soft text-attention' : 'bg-primary text-white'
        }`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <p className="eyebrow">{title}</p>
        <p className="mt-1 font-display text-lg leading-snug font-bold">{text}</p>
      </div>
    </div>
  )
}
