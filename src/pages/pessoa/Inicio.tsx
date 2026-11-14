import { LogOut } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/auth-context'
import { Avatar } from '../../components/Avatar'
import { DemoBanner } from '../../components/DemoBanner'
import { Logo } from '../../components/Logo'
import { CheckButton, ErrorState, Modal, Skeleton } from '../../components/ui'
import {
  useDailyLogs,
  useHabitChecks,
  useHabits,
  useLatestTip,
  useMarkTipRead,
  useToggleHabit,
} from '../../hooks/usePersonData'
import { addDays, formatHours, formatMinutes, formatTime, greeting, today } from '../../lib/dates'
import { specialtyLabel } from '../../lib/specialties'
import { bestStreak, currentStreak } from '../../lib/streak'

export function Inicio() {
  const { profile, signOut } = useAuth()
  const todayIso = today()

  const habits = useHabits()
  const checks = useHabitChecks()
  const logs = useDailyLogs(7)
  const tip = useLatestTip()
  const toggle = useToggleHabit()
  const markRead = useMarkTipRead()
  const [tipOpen, setTipOpen] = useState(false)

  const daysWithChecks = useMemo(() => new Set((checks.data ?? []).map((c) => c.check_date)), [checks.data])
  const doneToday = useMemo(
    () => new Set((checks.data ?? []).filter((c) => c.check_date === todayIso).map((c) => c.habit_id)),
    [checks.data, todayIso],
  )

  const streak = currentStreak(daysWithChecks, todayIso)
  const record = Math.max(bestStreak(daysWithChecks), streak)
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(todayIso, i - 6))
  const todayLog = logs.data?.find((l) => l.log_date === todayIso)
  const remaining = (habits.data ?? []).filter((h) => !doneToday.has(h.id)).length

  if (habits.error || checks.error) {
    return <ErrorState message={(habits.error ?? checks.error)?.message} onRetry={() => { habits.refetch(); checks.refetch() }} />
  }

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between lg:hidden">
        <Logo />
        <button
          onClick={signOut}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-lavender-soft font-display font-bold text-navy"
          title="Sair"
          aria-label="Sair da conta"
        >
          {profile?.full_name.charAt(0).toUpperCase() || <LogOut className="h-4 w-4" />}
        </button>
      </header>

      <div>
        <h1 className="text-[28px] font-bold">{greeting()}!</h1>
        <p className="text-sm text-muted">
          {habits.isLoading
            ? 'Carregando seu dia…'
            : remaining === 0
              ? 'Você fechou o dia. Mandou bem!'
              : `Faltam ${remaining} ${remaining === 1 ? 'hábito' : 'hábitos'} para fechar o dia.`}
        </p>
      </div>

      {/* Strike */}
      {checks.isLoading ? (
        <Skeleton className="h-32" />
      ) : (
        <div className="rounded-card bg-navy p-5 text-white">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold tracking-[0.12em] text-lavender uppercase">Strike</span>
            <span className="text-white/70">Recorde: {record} dias</span>
          </div>
          <p className="mt-2 font-display text-4xl font-extrabold">
            {streak} {streak === 1 ? 'dia seguido' : 'dias seguidos'}
          </p>
          <div className="mt-4 flex gap-2" aria-label="Últimos 7 dias">
            {last7.map((d) => (
              <span
                key={d}
                title={d}
                className={`h-2 flex-1 rounded-full ${daysWithChecks.has(d) ? 'bg-lavender' : 'bg-white/15'}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sono e foco */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="text-xs text-muted">Sono ontem</p>
          <p className="mt-1 font-display text-2xl font-bold">
            {logs.isLoading ? '…' : formatHours(todayLog?.sleep_hours)}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-muted">Foco hoje</p>
          <p className="mt-1 font-display text-2xl font-bold">
            {logs.isLoading ? '…' : formatMinutes(todayLog?.focus_minutes ?? 0)}
          </p>
        </div>
      </div>
      {!logs.isLoading && !todayLog && (
        <Link to="/rotina" className="block text-center text-sm font-semibold text-primary">
          Registrar sono, água e foco de hoje →
        </Link>
      )}

      {/* Dica do profissional */}
      {tip.data && (
        <div className="card flex items-center gap-3 border border-line">
          <Avatar
            seed={tip.data.professionals.profiles.avatar_seed}
            name={tip.data.professionals.profiles.full_name}
            size={44}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {specialtyLabel(tip.data.professionals.specialty)} {tip.data.professionals.profiles.full_name.split(' ')[0]}{' '}
              {tip.data.read_at ? 'deixou uma dica' : 'viu sua rotina'}
            </p>
            <p className="truncate text-xs text-muted">{tip.data.body}</p>
          </div>
          <button
            className="relative rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
            onClick={() => {
              setTipOpen(true)
              if (!tip.data!.read_at) markRead.mutate(tip.data!.id)
            }}
          >
            Ver
            {!tip.data.read_at && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-card bg-attention" />
            )}
          </button>
        </div>
      )}

      {/* Checklist de hoje */}
      <div className="card">
        <h2 className="eyebrow mb-1">Hoje</h2>
        {habits.isLoading ? (
          <div className="space-y-2 pt-2">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        ) : habits.data!.length === 0 ? (
          <p className="py-3 text-sm text-muted">
            Você ainda não tem hábitos.{' '}
            <Link to="/rotina" className="font-semibold text-primary">
              Monte sua rotina
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {habits.data!.map((h) => {
              const done = doneToday.has(h.id)
              return (
                <li key={h.id} className="flex items-center gap-3 py-3">
                  <CheckButton
                    checked={done}
                    label={h.name}
                    onChange={(next) => toggle.mutate({ habitId: h.id, date: todayIso, done: next })}
                  />
                  <span className={`flex-1 text-sm ${done ? 'text-muted line-through' : ''}`}>{h.name}</span>
                  <span className="text-xs text-muted">{formatTime(h.scheduled_time) ?? 'dia todo'}</span>
                </li>
              )
            })}
          </ul>
        )}
        {toggle.isError && <p className="pt-2 text-xs text-attention">Não deu para salvar. Tente de novo.</p>}
      </div>

      <DemoBanner />

      <Modal
        open={tipOpen}
        onClose={() => setTipOpen(false)}
        title={tip.data ? `Dica de ${tip.data.professionals.profiles.full_name}` : 'Dica'}
      >
        <p className="text-sm leading-relaxed">{tip.data?.body}</p>
        <button className="btn-primary w-full" onClick={() => setTipOpen(false)}>
          Entendi
        </button>
      </Modal>
    </section>
  )
}
