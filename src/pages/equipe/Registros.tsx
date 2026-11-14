import { BadgeCheck, CircleX, Clock, ExternalLink, MapPin } from 'lucide-react'
import { useId, useState } from 'react'
import { useAuth } from '../../auth/auth-context'
import { Avatar } from '../../components/Avatar'
import { DemoBanner } from '../../components/DemoBanner'
import { Logo } from '../../components/Logo'
import { SignOutButton } from '../../components/SignOutButton'
import { ErrorState, Modal, Skeleton } from '../../components/ui'
import { useRegistries, useReviewRegistry, type Decision, type RegistryRow } from '../../hooks/useTeamData'
import { formatDateTimeBR } from '../../lib/dates'
import {
  COUNCILS,
  decidedList,
  pendingQueue,
  REJECTION_MAX,
  REJECTION_PRESETS,
  STATUS_LABEL,
  validateRejectionReason,
  verificationStatus,
} from '../../lib/registry'
import { MODALITY_LABEL, specialtyLabel } from '../../lib/specialties'

type View = 'pendentes' | 'decididos'

const COPY: Record<View, { title: string; empty: string }> = {
  pendentes: {
    title: 'Registros para conferir',
    empty: 'Nenhum registro esperando. Quando um profissional se cadastrar ou trocar o registro, ele aparece aqui.',
  },
  decididos: {
    title: 'Registros decididos',
    empty: 'Nenhuma decisão ainda. Os registros aprovados ou recusados aparecem aqui.',
  },
}

/** Área da equipe Skyro: conferir o registro no conselho e aprovar ou recusar. */
export function Registros({ view }: { view: View }) {
  const { profile } = useAuth()
  const registries = useRegistries()
  const review = useReviewRegistry()
  const [target, setTarget] = useState<{ pro: RegistryRow; decision: Decision } | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const list = registries.data ? (view === 'pendentes' ? pendingQueue(registries.data) : decidedList(registries.data)) : []
  const pendingCount = registries.data ? pendingQueue(registries.data).length : 0
  const demoTeam = Boolean(profile?.is_demo)

  function open(pro: RegistryRow, decision: Decision) {
    review.reset()
    setDone(null)
    setTarget({ pro, decision })
  }

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between lg:hidden">
        <span className="flex items-center gap-2">
          <Logo />
          <span className="rounded-md bg-navy px-1.5 py-0.5 text-[10px] font-bold text-white">EQUIPE</span>
        </span>
        <SignOutButton />
      </header>

      <div>
        <h1 className="text-[28px] font-bold">{COPY[view].title}</h1>
        <p className="text-sm text-muted">
          {view === 'pendentes'
            ? 'Confira o número na consulta do conselho antes de aprovar.'
            : 'Você pode rever uma decisão a qualquer momento.'}
        </p>
      </div>

      {view === 'pendentes' && registries.data && (
        <div className="flex items-center gap-4 rounded-card bg-navy px-5 py-4 text-white">
          <span className="font-display text-4xl font-extrabold text-lavender">{pendingCount}</span>
          <div>
            <p className="font-semibold">
              {pendingCount === 0
                ? 'Nenhum registro esperando'
                : pendingCount === 1
                  ? 'registro esperando conferência'
                  : 'registros esperando conferência'}
            </p>
            <p className="text-xs text-white/70">quem espera há mais tempo aparece primeiro</p>
          </div>
        </div>
      )}

      {demoTeam && (
        <p className="rounded-xl bg-lavender-soft px-3 py-2 text-sm text-primary">
          Conta demo da equipe: você só decide sobre perfis de demonstração. Para voltar ao começo, rode os seeds de novo.
        </p>
      )}

      {done && (
        <p role="status" className="rounded-xl bg-lavender-soft px-3 py-2 text-sm text-primary">
          {done}
        </p>
      )}

      {registries.error ? (
        <ErrorState message={registries.error.message} onRetry={() => registries.refetch()} />
      ) : registries.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <p className="card text-sm text-muted">{COPY[view].empty}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {list.map((pro) => (
            <RegistryCard
              key={pro.id}
              pro={pro}
              locked={demoTeam && !pro.is_demo}
              onDecide={(decision) => open(pro, decision)}
            />
          ))}
        </ul>
      )}

      {target && (
        <DecisionModal
          key={`${target.pro.id}-${target.decision}`}
          pro={target.pro}
          decision={target.decision}
          saving={review.isPending}
          error={review.error?.message}
          onClose={() => setTarget(null)}
          onConfirm={async (reason) => {
            try {
              await review.mutateAsync({
                professionalId: target.pro.id,
                decision: target.decision,
                registry: target.pro.registry!,
                reason,
              })
              const first = target.pro.profiles.full_name.split(' ')[0]
              setDone(
                target.decision === 'aprovado'
                  ? `Registro de ${first} aprovado. O selo já aparece no perfil.`
                  : `Registro de ${first} recusado. ${first} vê o motivo no perfil e saiu da busca até corrigir.`,
              )
              setTarget(null)
            } catch {
              /* a mensagem aparece no modal */
            }
          }}
        />
      )}

      <div className="lg:hidden">
        <SignOutButton />
      </div>
      <DemoBanner />
    </section>
  )
}

function StatusBadge({ pro }: { pro: RegistryRow }) {
  const status = verificationStatus(pro)
  const Icon = status === 'aprovado' ? BadgeCheck : status === 'recusado' ? CircleX : Clock
  const color =
    status === 'aprovado'
      ? 'bg-lavender-soft text-primary'
      : status === 'recusado'
        ? 'bg-attention-soft text-attention'
        : 'bg-chip text-muted'
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${color}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {STATUS_LABEL[status]}
    </span>
  )
}

function RegistryCard({
  pro,
  locked,
  onDecide,
}: {
  pro: RegistryRow
  locked: boolean
  onDecide: (d: Decision) => void
}) {
  const status = verificationStatus(pro)
  const council = COUNCILS[pro.specialty]
  const name = pro.profiles.full_name

  return (
    <li className="card min-w-0 space-y-3">
      <div className="flex items-start gap-3">
        <Avatar seed={pro.profiles.avatar_seed} name={name} size={48} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{name}</p>
          <p className="text-sm text-muted">
            {specialtyLabel(pro.specialty)} · {MODALITY_LABEL[pro.modality]}
          </p>
          <div className="mt-1.5">
            <StatusBadge pro={pro} />
          </div>
        </div>
      </div>

      <dl className="space-y-1 text-sm">
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-muted">Registro:</dt>
          <dd className="font-mono font-semibold break-all">{pro.registry}</dd>
        </div>
        {pro.neighborhood && (
          <div className="text-muted">
            <dt className="sr-only">Local:</dt>
            <dd className="flex items-center gap-1">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" /> {pro.neighborhood}, {pro.city}
            </dd>
          </div>
        )}
        <div className="flex flex-wrap gap-x-2 text-muted">
          <dt>{status === 'pendente' ? 'Cadastro:' : 'Decidido em:'}</dt>
          <dd>
            {status === 'pendente'
              ? formatDateTimeBR(pro.created_at)
              : pro.reviewed_at
                ? formatDateTimeBR(pro.reviewed_at)
                : 'antes da área da equipe'}
          </dd>
        </div>
        {pro.is_demo && (
          <div>
            <dt className="sr-only">Tipo:</dt>
            <dd className="chip">Perfil demonstrativo</dd>
          </div>
        )}
      </dl>

      {status === 'recusado' && pro.rejection_reason && (
        <p className="rounded-xl bg-attention-soft px-3 py-2 text-sm text-attention">
          <span className="font-semibold">Motivo:</span> {pro.rejection_reason}
        </p>
      )}

      <a
        href={council.url}
        target="_blank"
        rel="noopener noreferrer"
        className="tap gap-1.5 text-sm font-semibold text-primary"
      >
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
        {council.kind === 'consulta' ? `Consultar no ${council.acronym}` : `Abrir o site do ${council.acronym}`}
        <span className="sr-only"> (abre em nova aba)</span>
      </a>

      {locked ? (
        <p className="text-xs text-muted">Perfil real: só a equipe de verdade decide sobre ele.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {status !== 'aprovado' && (
            <button className="btn-primary flex-1" onClick={() => onDecide('aprovado')}>
              <BadgeCheck className="h-4 w-4" aria-hidden="true" /> Aprovar
            </button>
          )}
          {status !== 'recusado' && (
            <button className="btn-outline flex-1" onClick={() => onDecide('recusado')}>
              <CircleX className="h-4 w-4" aria-hidden="true" /> Recusar
            </button>
          )}
        </div>
      )}
    </li>
  )
}

function DecisionModal({
  pro,
  decision,
  saving,
  error,
  onClose,
  onConfirm,
}: {
  pro: RegistryRow
  decision: Decision
  saving: boolean
  error?: string
  onClose: () => void
  onConfirm: (reason?: string) => void
}) {
  const [reason, setReason] = useState(pro.rejection_reason ?? '')
  const [touched, setTouched] = useState(false)
  const reasonId = useId()
  const hintId = useId()
  const name = pro.profiles.full_name
  const reject = decision === 'recusado'
  const reasonError = reject ? validateRejectionReason(reason) : null

  return (
    <Modal open onClose={onClose} title={reject ? `Recusar o registro de ${name}?` : `Aprovar o registro de ${name}?`}>
      <p className="text-sm">
        <span className="text-muted">{specialtyLabel(pro.specialty)} · </span>
        <span className="font-mono font-semibold break-all">{pro.registry}</span>
      </p>

      {reject ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            setTouched(true)
            if (!reasonError) onConfirm(reason)
          }}
        >
          <fieldset className="space-y-2">
            <legend className="eyebrow mb-1">Motivos comuns</legend>
            <div className="flex flex-wrap gap-2">
              {REJECTION_PRESETS.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={reason === r}
                  onClick={() => setReason(r)}
                  className={`min-h-11 rounded-2xl border px-3 py-2 text-left text-xs font-medium transition ${
                    reason === r ? 'border-primary bg-lavender-soft text-primary' : 'border-line bg-card text-ink'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </fieldset>
          <label htmlFor={reasonId} className="eyebrow block">
            Motivo da recusa
          </label>
          <textarea
            id={reasonId}
            className="input min-h-24 resize-y"
            maxLength={REJECTION_MAX}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-describedby={hintId}
            aria-invalid={touched && Boolean(reasonError)}
          />
          <p id={hintId} className={`text-xs ${touched && reasonError ? 'text-attention' : 'text-muted'}`}>
            {touched && reasonError
              ? reasonError
              : `${name.split(' ')[0]} vê este texto no perfil e sai da busca até corrigir o registro.`}
          </p>
          {error && (
            <p role="alert" className="rounded-xl bg-attention-soft px-3 py-2 text-sm text-attention">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" className="btn-outline flex-1" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Salvando…' : 'Recusar registro'}
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="text-sm text-muted">
            Aprove só se o número, o nome e a profissão conferem na consulta do {COUNCILS[pro.specialty].acronym}. O
            selo de “registro verificado” aparece no perfil na hora.
          </p>
          {error && (
            <p role="alert" className="rounded-xl bg-attention-soft px-3 py-2 text-sm text-attention">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" className="btn-outline flex-1" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="btn-primary flex-1" disabled={saving} onClick={() => onConfirm()}>
              {saving ? 'Salvando…' : 'Aprovar registro'}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
