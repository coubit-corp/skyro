import { Droplet, Dumbbell, Minus, MessageCircle, Moon, Plus, Timer, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { DemoBanner } from '../../components/DemoBanner'
import { CheckButton, ErrorState, Modal, PageHeader, Skeleton } from '../../components/ui'
import {
  useAddHabit,
  useArchiveHabit,
  useDailyLogs,
  useHabitChecks,
  useHabits,
  useSaveDailyLog,
  useToggleHabit,
} from '../../hooks/usePersonData'
import type { HabitKind } from '../../lib/database.types'
import { dayOfMonth, formatHours, formatTime, longDate, today, weekdayShort, weekOf } from '../../lib/dates'

export function Rotina() {
  const todayIso = today()
  const [selected, setSelected] = useState(todayIso)
  const week = weekOf(todayIso)

  const habits = useHabits()
  const checks = useHabitChecks(14)
  const toggle = useToggleHabit()
  const archive = useArchiveHabit()
  const [adding, setAdding] = useState(false)

  const doneOnSelected = useMemo(
    () => new Set((checks.data ?? []).filter((c) => c.check_date === selected).map((c) => c.habit_id)),
    [checks.data, selected],
  )
  const isFuture = selected > todayIso

  if (habits.error) return <ErrorState message={habits.error.message} onRetry={() => habits.refetch()} />

  return (
    <section className="space-y-4">
      <PageHeader
        title={selected === todayIso ? 'Rotina de hoje' : 'Rotina'}
        subtitle={selected === todayIso ? undefined : longDate(selected)}
      />

      {/* Semana */}
      <div className="grid grid-cols-7 gap-1.5" role="tablist" aria-label="Dia da semana">
        {week.map((d) => {
          const active = d === selected
          return (
            <button
              key={d}
              role="tab"
              aria-selected={active}
              aria-label={longDate(d)}
              onClick={() => setSelected(d)}
              className={`flex flex-col items-center rounded-2xl py-2 transition ${
                active ? 'bg-navy text-white' : 'bg-card text-ink hover:bg-lavender-soft'
              } ${d === todayIso && !active ? 'ring-1 ring-primary' : ''}`}
            >
              <span className={`text-[11px] ${active ? 'text-white/80' : 'text-muted'}`}>{weekdayShort(d)}</span>
              <span className="font-display text-lg font-bold">{dayOfMonth(d)}</span>
            </button>
          )
        })}
      </div>

      {/* Avisos no WhatsApp: simulado no MVP */}
      <div className="flex items-center gap-3 rounded-card border border-line bg-card px-4 py-3">
        <MessageCircle className="h-5 w-5 text-primary" aria-hidden="true" />
        <span className="flex-1 text-sm">Avisos no WhatsApp</span>
        <span className="chip">Em breve</span>
      </div>

      {/* Hábitos do dia */}
      <div className="card">
        {habits.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : habits.data!.length === 0 ? (
          <p className="py-2 text-sm text-muted">Nenhum hábito ainda. Adicione o primeiro abaixo.</p>
        ) : (
          <ul className="divide-y divide-line">
            {habits.data!.map((h) => {
              const done = doneOnSelected.has(h.id)
              return (
                <li key={h.id} className="group flex items-center gap-3 py-3">
                  <span className="w-12 text-sm font-semibold text-muted">{formatTime(h.scheduled_time) ?? '—'}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${done ? 'text-muted line-through' : ''}`}>{h.name}</p>
                    {h.goal && <p className="text-xs text-muted">{h.goal}</p>}
                  </div>
                  <button
                    className="rounded-lg p-1.5 text-muted opacity-0 transition group-hover:opacity-100 hover:text-attention focus:opacity-100"
                    aria-label={`Remover ${h.name}`}
                    onClick={() => {
                      if (confirm(`Remover "${h.name}" da sua rotina?`)) archive.mutate(h.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <CheckButton
                    checked={done}
                    label={h.name}
                    disabled={isFuture}
                    onChange={(next) => toggle.mutate({ habitId: h.id, date: selected, done: next })}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <button
        onClick={() => setAdding(true)}
        className="w-full rounded-card border-2 border-dashed border-lavender py-3 text-sm font-semibold text-primary hover:bg-lavender-soft"
      >
        + Adicionar hábito
      </button>

      {isFuture ? (
        <p className="card text-center text-sm text-muted">O registro deste dia abre quando ele chegar.</p>
      ) : (
        <DayLogForm date={selected} />
      )}

      <DemoBanner />
      <AddHabitModal open={adding} onClose={() => setAdding(false)} />
    </section>
  )
}

// ---------------------------------------------------------------------------

function DayLogForm({ date }: { date: string }) {
  const logs = useDailyLogs(14)
  const save = useSaveDailyLog()
  const existing = logs.data?.find((l) => l.log_date === date)

  const [sleep, setSleep] = useState(7)
  const [water, setWater] = useState(0)
  const [focus, setFocus] = useState(0)
  const [workoutPlanned, setWorkoutPlanned] = useState(false)
  const [workoutDone, setWorkoutDone] = useState(false)
  const [saved, setSaved] = useState(false)

  // Carrega o registro salvo quando troca de dia ou quando ele muda no banco.
  // Depende de updated_at (e não do objeto) para um refetch não apagar o que a pessoa está editando.
  useEffect(() => {
    setSleep(existing?.sleep_hours ?? 7)
    setWater(existing?.water_liters ?? 0)
    setFocus(existing?.focus_minutes ?? 0)
    setWorkoutPlanned(existing?.workout_planned ?? false)
    setWorkoutDone(existing?.workout_done ?? false)
    setSaved(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id, existing?.updated_at, date])

  const goal = existing?.water_goal_liters ?? 2

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await save.mutateAsync({
      log_date: date,
      sleep_hours: sleep,
      water_liters: water,
      focus_minutes: focus,
      workout_planned: workoutPlanned || workoutDone,
      workout_done: workoutDone,
    })
    setSaved(true)
  }

  if (logs.isLoading) return <Skeleton className="h-64" />

  return (
    <form onSubmit={handleSubmit} className="card space-y-4" onChange={() => setSaved(false)}>
      <h2 className="eyebrow">Registro do dia</h2>

      <Stepper
        icon={<Moon className="h-5 w-5" />}
        label="Sono da noite anterior"
        value={sleep}
        display={formatHours(sleep)}
        onChange={(v) => { setSleep(v); setSaved(false) }}
        step={0.5}
        min={0}
        max={14}
      />
      <Stepper
        icon={<Droplet className="h-5 w-5" />}
        label={`Água (meta ${goal.toLocaleString('pt-BR')} L)`}
        value={water}
        display={`${water.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} L`}
        onChange={(v) => { setWater(v); setSaved(false) }}
        step={0.25}
        min={0}
        max={6}
      />
      <Stepper
        icon={<Timer className="h-5 w-5" />}
        label="Tempo de foco"
        value={focus}
        display={`${focus} min`}
        onChange={(v) => { setFocus(v); setSaved(false) }}
        step={10}
        min={0}
        max={600}
      />

      <div className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-3">
        <Dumbbell className="h-5 w-5 text-primary" aria-hidden="true" />
        <span className="flex-1 text-sm">Tinha treino planejado?</span>
        <CheckButton checked={workoutPlanned || workoutDone} label="Tinha treino planejado" onChange={(v) => { setWorkoutPlanned(v); if (!v) setWorkoutDone(false); setSaved(false) }} />
      </div>
      {(workoutPlanned || workoutDone) && (
        <div className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-3">
          <Dumbbell className="h-5 w-5 text-primary" aria-hidden="true" />
          <span className="flex-1 text-sm">Treinei</span>
          <CheckButton checked={workoutDone} label="Treino feito" onChange={(v) => { setWorkoutDone(v); setSaved(false) }} />
        </div>
      )}

      {save.isError && <p className="text-sm text-attention">Não deu para salvar: {save.error.message}</p>}
      <button type="submit" className="btn-primary w-full" disabled={save.isPending}>
        {save.isPending ? 'Salvando…' : saved ? 'Salvo ✓' : existing ? 'Atualizar registro' : 'Salvar registro'}
      </button>
    </form>
  )
}

function Stepper({
  icon,
  label,
  value,
  display,
  onChange,
  step,
  min,
  max,
}: {
  icon: ReactNode
  label: string
  value: number
  display: string
  onChange: (v: number) => void
  step: number
  min: number
  max: number
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 100) / 100))
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-lavender-soft text-primary" aria-hidden="true">
        {icon}
      </span>
      <span className="flex-1 text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Diminuir ${label}`}
          onClick={() => onChange(clamp(value - step))}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-line"
        >
          <Minus className="h-4 w-4" />
        </button>
        <output className="w-16 text-center font-display font-bold" aria-live="polite">
          {display}
        </output>
        <button
          type="button"
          aria-label={`Aumentar ${label}`}
          onClick={() => onChange(clamp(value + step))}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-line"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

const KINDS: { value: HabitKind; label: string }[] = [
  { value: 'treino', label: 'Treino' },
  { value: 'agua', label: 'Água' },
  { value: 'foco', label: 'Foco' },
  { value: 'sono', label: 'Sono' },
  { value: 'outro', label: 'Outro' },
]

function AddHabitModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const add = useAddHabit()
  const [name, setName] = useState('')
  const [kind, setKind] = useState<HabitKind>('outro')
  const [time, setTime] = useState('')
  const [goal, setGoal] = useState('')

  function reset() {
    setName('')
    setKind('outro')
    setTime('')
    setGoal('')
    add.reset()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await add.mutateAsync({
      name: name.trim(),
      kind,
      scheduled_time: time || null,
      goal: goal.trim() || null,
    })
    reset()
    onClose()
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="Novo hábito">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input className="input" placeholder="Nome (ex.: Alongar)" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        <select className="input" value={kind} onChange={(e) => setKind(e.target.value as HabitKind)} aria-label="Tipo">
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-muted">
            Horário (opcional)
            <input className="input mt-1" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
          <label className="text-xs text-muted">
            Meta (opcional)
            <input className="input mt-1" placeholder="ex.: 15 min" maxLength={30} value={goal} onChange={(e) => setGoal(e.target.value)} />
          </label>
        </div>
        {add.isError && <p className="text-sm text-attention">Não deu para salvar: {add.error.message}</p>}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button type="button" className="btn-outline" onClick={() => { reset(); onClose() }}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={add.isPending}>{add.isPending ? 'Salvando…' : 'Adicionar'}</button>
        </div>
      </form>
    </Modal>
  )
}
