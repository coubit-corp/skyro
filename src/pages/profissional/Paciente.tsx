import { AlertTriangle, ChevronLeft, Send, Sparkles } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Avatar } from '../../components/Avatar'
import { DemoBanner } from '../../components/DemoBanner'
import { ErrorState, SectionTitle, Skeleton } from '../../components/ui'
import { usePatient, useSendTip } from '../../hooks/useProData'
import { evaluatePatient } from '../../lib/alerts'
import { addDays, formatHours, formatMinutes, today, weekdayShort } from '../../lib/dates'
import { SHARED_DATA } from '../../lib/specialties'
import { currentStreak } from '../../lib/streak'
import { buildWeekSummary } from '../../lib/weekSummary'

const TIP_MAX = 1000

function monthsSince(iso: string): string {
  const months = Math.floor((Date.now() - new Date(iso).getTime()) / (30.4 * 86_400_000))
  if (months < 1) return 'há menos de 1 mês'
  return months === 1 ? 'há 1 mês' : `há ${months} meses`
}

export function Paciente() {
  const { id } = useParams()
  const patient = usePatient(id)
  const sendTip = useSendTip()
  const [tip, setTip] = useState('')
  const [sent, setSent] = useState(false)
  const todayIso = today()

  const derived = useMemo(() => {
    if (!patient.data) return null
    const evaluation = evaluatePatient(patient.data.logs, todayIso)
    const week = Array.from({ length: 7 }, (_, i) => addDays(todayIso, i - 6))
    const byDate = new Map(patient.data.logs.map((l) => [l.log_date, l]))
    const weekLogs = week.flatMap((d) => (byDate.has(d) ? [byDate.get(d)!] : []))
    const sleeps = weekLogs.flatMap((l) => (l.sleep_hours != null ? [l.sleep_hours] : []))
    return {
      evaluation,
      summary: buildWeekSummary(patient.data.logs, evaluation, todayIso),
      streak: currentStreak(patient.data.checkDays, todayIso),
      avgSleep: sleeps.length ? sleeps.reduce((a, b) => a + b, 0) / sleeps.length : null,
      week,
      byDate,
    }
  }, [patient.data, todayIso])

  if (patient.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    )
  }
  if (patient.error) return <ErrorState message={patient.error.message} onRetry={() => patient.refetch()} />
  if (!patient.data || !derived) {
    return (
      <div className="card space-y-3 text-center">
        <p className="font-semibold">Este paciente não compartilha mais a rotina com você.</p>
        <p className="text-sm text-muted">Quando a pessoa revoga o acesso, os dados dela deixam de aparecer aqui.</p>
        <Link to="/pro" className="btn-primary">Voltar para pacientes</Link>
      </div>
    )
  }

  const { share, tips } = patient.data
  const name = share.profiles.full_name
  const firstName = name.split(' ')[0]
  const e = derived.evaluation

  async function handleSend(ev: FormEvent) {
    ev.preventDefault()
    if (!tip.trim()) return
    await sendTip.mutateAsync({ personId: share.person_id, body: tip.trim() })
    setTip('')
    setSent(true)
  }

  return (
    <section className="space-y-4">
      <Link to="/pro" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Pacientes
      </Link>

      <div className="flex items-center gap-4">
        <Avatar seed={share.profiles.avatar_seed} name={name} size={72} />
        <div>
          <h1 className="text-2xl font-bold">{name}</h1>
          <p className="text-sm text-muted">Compartilha com você {monthsSince(share.created_at)}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted">Você vê:</span>
        {SHARED_DATA.map((d) => (
          <span key={d} className="chip">{d.toLowerCase()}</span>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          {/* Números da semana */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-card bg-navy p-3 text-white">
              <p className="text-xs text-white/70">Strike</p>
              <p className="font-display text-xl font-bold">{derived.streak} {derived.streak === 1 ? 'dia' : 'dias'}</p>
            </div>
            <div className="card p-3">
              <p className="text-xs text-muted">Treinos</p>
              <p className="font-display text-xl font-bold">{e.workoutsDone} de {e.workoutsPlanned}</p>
            </div>
            <div className="card p-3">
              <p className="text-xs text-muted">Sono médio</p>
              <p className="font-display text-xl font-bold">{formatHours(derived.avgSleep != null ? Math.round(derived.avgSleep * 6) / 6 : null)}</p>
            </div>
          </div>

          {/* Alertas */}
          {e.alerts.length > 0 && (
            <div className="rounded-card border border-attention/30 bg-attention-soft p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-attention">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Precisa de atenção
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {e.alerts.map((a) => (
                  <li key={a.kind}>• {a.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Resumo da semana */}
          <div className="card space-y-2 border border-lavender">
            <p className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Sparkles className="h-4 w-4" aria-hidden="true" /> Resumo da semana
            </p>
            <ul className="space-y-1.5 text-sm leading-relaxed">
              {derived.summary.lines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <p className="text-sm font-semibold">{derived.summary.attention}</p>
            <p className="text-[11px] text-muted">
              Gerado automaticamente a partir dos registros. Não é diagnóstico: use como apoio à sua avaliação.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Semana dia a dia */}
          <div className="card">
            <h2 className="eyebrow mb-2">Últimos 7 dias</h2>
            <div className="grid grid-cols-[3rem_1fr_1fr_1fr_auto] items-center gap-x-2 gap-y-2.5 text-sm">
              <span />
              <span className="text-xs text-muted">Sono</span>
              <span className="text-xs text-muted">Água</span>
              <span className="text-xs text-muted">Foco</span>
              <span className="text-xs text-muted">Treino</span>
              {derived.week.map((d) => {
                const l = derived.byDate.get(d)
                // Hoje ainda está acontecendo: água baixa só conta a partir de ontem (mesma regra do alerta)
                const lowWater = d !== todayIso && l?.water_liters != null && l.water_liters < l.water_goal_liters * 0.5
                const workout = !l?.workout_planned
                  ? null
                  : l.workout_done
                    ? 'Feito'
                    : d === todayIso
                      ? 'Hoje'
                      : 'Faltou'
                return (
                  <div key={d} className="contents">
                    <span className="font-semibold text-muted">{d === todayIso ? 'Hoje' : weekdayShort(d)}</span>
                    {l ? (
                      <>
                        <span className={l.sleep_hours != null && l.sleep_hours < 6 ? 'font-semibold text-attention' : ''}>
                          {formatHours(l.sleep_hours)}
                        </span>
                        <span className={lowWater ? 'font-semibold text-attention' : ''}>
                          {l.water_liters != null ? `${l.water_liters.toLocaleString('pt-BR')} L` : '—'}
                        </span>
                        <span>{formatMinutes(l.focus_minutes)}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-center text-xs font-semibold ${
                            workout === 'Faltou' ? 'bg-attention-soft text-attention' : workout ? 'bg-chip text-muted' : 'text-muted'
                          }`}
                        >
                          {workout ?? '—'}
                        </span>
                      </>
                    ) : (
                      <span className="col-span-4 text-xs text-muted">sem registro</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Enviar dica */}
          <form onSubmit={handleSend} className="card space-y-3">
            <h2 className="eyebrow">Enviar dica para {firstName}</h2>
            <textarea
              className="input min-h-28 resize-y"
              placeholder={`Ex.: ${firstName}, vi que você dormiu pouco. Que tal jantar mais cedo hoje?`}
              maxLength={TIP_MAX}
              value={tip}
              onChange={(ev) => {
                setTip(ev.target.value)
                setSent(false)
              }}
              aria-label="Texto da dica"
            />
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Aparece no Início do app de {firstName}.</span>
              <span>{tip.length} / {TIP_MAX}</span>
            </div>
            {sendTip.isError && <p className="text-sm text-attention">Não deu para enviar: {sendTip.error.message}</p>}
            <button type="submit" className="btn-primary w-full" disabled={!tip.trim() || sendTip.isPending}>
              <Send className="h-4 w-4" aria-hidden="true" />
              {sendTip.isPending ? 'Enviando…' : sent ? 'Dica enviada ✓' : 'Enviar dica'}
            </button>
          </form>

          {tips.length > 0 && (
            <div>
              <SectionTitle>Dicas enviadas</SectionTitle>
              <ul className="space-y-2">
                {tips.map((t) => (
                  <li key={t.id} className="card space-y-1 text-sm">
                    <p>{t.body}</p>
                    <p className="text-xs text-muted">
                      {new Date(t.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} ·{' '}
                      {t.read_at ? 'Lida' : 'Ainda não lida'}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <DemoBanner />
    </section>
  )
}
