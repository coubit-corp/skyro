import { CalendarDays, PlayCircle, Search } from 'lucide-react'
import { useId } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Avatar } from '../../components/Avatar'
import { DemoBanner } from '../../components/DemoBanner'
import { CheckButton, ErrorState, PageHeader, Skeleton } from '../../components/ui'
import { useMyPlan, useSetPain, useTogglePlanCheck, type MyPlan, type PersonPlanItem } from '../../hooks/usePlanData'
import { today } from '../../lib/dates'
import {
  dayHeadline,
  itemDetail,
  itemsForDay,
  PAIN_LEVELS,
  PLAN_TABS,
  weekdaysLabel,
} from '../../lib/plan'
import { SPECIALTIES } from '../../lib/specialties'

type TabInfo = (typeof PLAN_TABS)[number]

export function Plano() {
  const plan = useMyPlan()
  const [params, setParams] = useSearchParams()
  const current = PLAN_TABS.find((t) => t.tab === params.get('aba')) ?? PLAN_TABS[0]
  const tabsId = useId()

  return (
    <section className="space-y-4">
      <PageHeader title="Meu plano" subtitle="Tudo o que sua equipe preparou, num lugar só." />

      <div role="tablist" aria-label="Áreas do plano" className="grid grid-cols-4 gap-1 rounded-2xl bg-lavender-soft p-1">
        {PLAN_TABS.map((t) => (
          <button
            key={t.tab}
            role="tab"
            id={`${tabsId}-${t.tab}`}
            aria-selected={t.tab === current.tab}
            aria-controls={`${tabsId}-painel`}
            onClick={() => setParams(t.tab === 'treino' ? {} : { aba: t.tab }, { replace: true })}
            className={`min-h-11 rounded-xl px-1 text-sm font-semibold transition ${
              t.tab === current.tab ? 'bg-card text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`${tabsId}-painel`} aria-labelledby={`${tabsId}-${current.tab}`} className="space-y-4">
        {plan.isLoading ? (
          <>
            <Skeleton className="h-36" />
            <Skeleton className="h-48" />
          </>
        ) : plan.error ? (
          <ErrorState message={plan.error.message} onRetry={() => plan.refetch()} />
        ) : (
          <TabContent tab={current} plan={plan.data!} />
        )}
      </div>

      <DemoBanner />
    </section>
  )
}

/** Profissionais desta área: os da equipe (ativos) e os antigos que deixaram plano. */
function prosOfTab(tab: TabInfo, plan: MyPlan) {
  const ids = new Set<string>()
  for (const [proId, s] of plan.shares) {
    if (s.professionals.specialty === tab.specialty && !s.revoked_at) ids.add(proId)
  }
  for (const i of plan.items) if (i.kind === tab.kind) ids.add(i.professional_id)
  return [...ids]
}

function TabContent({ tab, plan }: { tab: TabInfo; plan: MyPlan }) {
  const pros = prosOfTab(tab, plan)
  if (pros.length === 0) {
    const plural = SPECIALTIES.find((s) => s.value === tab.specialty)!.plural.toLowerCase()
    return (
      <div className="card space-y-3 text-sm">
        <p className="font-semibold">Você ainda não tem {plural} na sua equipe.</p>
        <p className="text-muted">
          Quando um profissional acompanha sua rotina, o plano que ele montar para você aparece aqui.
        </p>
        <Link to={`/saude/perto?especialidade=${tab.specialty}`} className="btn-outline w-full sm:w-auto">
          <Search className="h-4 w-4" aria-hidden="true" /> Encontrar no Perto de você
        </Link>
      </div>
    )
  }
  return (
    <>
      {pros.map((proId) => (
        <ProPlan key={proId} tab={tab} proId={proId} plan={plan} />
      ))}
    </>
  )
}

function ProPlan({ tab, proId, plan }: { tab: TabInfo; proId: string; plan: MyPlan }) {
  const todayIso = today()
  const share = plan.shares.get(proId)
  const items = plan.items.filter((i) => i.professional_id === proId && i.kind === tab.kind)
  const author = items[0]?.professionals ?? share?.professionals
  const name = author?.profiles.full_name ?? 'Seu profissional'
  const first = name.split(' ')[0]
  const ended = !share || Boolean(share.revoked_at)
  const note = plan.notes.find((n) => n.professional_id === proId)
  const todayItems = itemsForDay(items, todayIso)

  return (
    <article className="space-y-3" aria-label={`Plano de ${name}`}>
      <div className="rounded-card bg-navy p-5 text-white">
        <div className="flex items-center gap-3">
          <Avatar seed={author?.profiles.avatar_seed} name={name} size={40} />
          <p className="eyebrow text-lavender">
            {tab.area} · {first}
          </p>
        </div>
        <h2 className="mt-3 text-2xl font-bold">{dayHeadline(tab.kind, todayItems)}</h2>
        {note && (
          <p className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-sm leading-relaxed">
            <span className="font-semibold">Recado de {first}:</span> {note.note}
          </p>
        )}
        {ended && (
          <p className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-sm">
            Acompanhamento encerrado: {first} não vê mais sua rotina. O plano fica aqui para você consultar.
          </p>
        )}
      </div>

      {tab.kind === 'fisio' && !ended && <PainCard value={plan.painToday} />}

      {items.length === 0 ? (
        <p className="card text-sm text-muted">{first} ainda não montou seu plano.</p>
      ) : (
        <>
          {todayItems.length > 0 ? (
            <ul className="card divide-y divide-line py-1">
              {todayItems.map((i) => (
                <PlanRow key={i.id} item={i} done={plan.doneToday.has(i.id)} readOnly={ended} />
              ))}
            </ul>
          ) : (
            <p className="card text-sm text-muted">Hoje é dia de descanso nesta área.</p>
          )}
          <WeekList items={items} />
        </>
      )}
    </article>
  )
}

function PlanRow({ item, done, readOnly }: { item: PersonPlanItem; done: boolean; readOnly: boolean }) {
  const toggle = useTogglePlanCheck()
  const detail = itemDetail(item)
  return (
    <li className="flex items-center gap-3 py-3">
      {readOnly ? (
        <span className="h-6 w-6 shrink-0" aria-hidden="true" />
      ) : (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center">
          <CheckButton
            checked={done}
            label={`${item.title}: feito hoje`}
            disabled={toggle.isPending}
            onChange={(next) => toggle.mutate({ itemId: item.id, done: next })}
          />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className={`font-semibold ${done ? 'text-muted line-through' : ''}`}>{item.title}</p>
        {detail && <p className="text-sm text-muted">{detail}</p>}
        {item.notes && <p className="text-xs text-muted">{item.notes}</p>}
      </div>
      {item.video_url && (
        <a
          href={item.video_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-chip px-3 text-xs font-semibold text-ink"
        >
          <PlayCircle className="h-4 w-4" aria-hidden="true" /> Vídeo
          <span className="sr-only"> de {item.title} (abre em nova aba)</span>
        </a>
      )}
    </li>
  )
}

function PainCard({ value }: { value: number | null }) {
  const setPain = useSetPain()
  const shown = setPain.isPending ? setPain.variables : value
  const labelId = useId()
  return (
    <div className="card space-y-3">
      <p id={labelId} className="text-sm font-semibold">
        Dor hoje (0 a 10)
      </p>
      <div role="group" aria-labelledby={labelId} className="grid grid-cols-6 gap-2">
        {PAIN_LEVELS.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={shown === n}
            onClick={() => setPain.mutate(n)}
            className={`min-h-11 rounded-xl border text-sm font-semibold transition ${
              shown === n ? 'border-primary bg-primary text-white' : 'border-line bg-card text-ink hover:border-lavender'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      {setPain.isError && <p className="text-sm text-attention">Não deu para salvar: {setPain.error.message}</p>}
      <p className="text-xs text-muted">0 é sem dor. Seu fisio acompanha como a dor muda na semana.</p>
    </div>
  )
}

function WeekList({ items }: { items: PersonPlanItem[] }) {
  return (
    <details className="card group">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-primary">
        <CalendarDays className="h-4 w-4" aria-hidden="true" /> Ver o plano da semana
      </summary>
      <ul className="mt-2 divide-y divide-line">
        {items.map((i) => (
          <li key={i.id} className="py-2.5 text-sm">
            <p className="font-semibold">{i.title}</p>
            <p className="text-muted">
              {[weekdaysLabel(i.weekdays), itemDetail(i)].filter(Boolean).join(' · ')}
            </p>
          </li>
        ))}
      </ul>
    </details>
  )
}
