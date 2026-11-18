import { BadgeCheck, CalendarClock, ChevronRight, CircleX, Clock, Lock, MapPin, Pencil } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/auth-context'
import { AccountSection } from '../../components/AccountSection'
import { AvailabilityEditor } from '../../components/AvailabilityEditor'
import { Avatar } from '../../components/Avatar'
import { DemoBanner } from '../../components/DemoBanner'
import { ProfessionalForm } from '../../components/ProfessionalForm'
import { ProfileTabs } from '../../components/ProfileTabs'
import { ExperienceCard, ReviewItem, RatingSummary, SocialButtons } from '../../components/Showcase'
import { ShowcaseEditor } from '../../components/ShowcaseEditor'
import { SignOutButton } from '../../components/SignOutButton'
import { ErrorState, PageHeader, Skeleton } from '../../components/ui'
import { useMyPhone, useSaveAccount } from '../../hooks/useAccount'
import { useMyProfessional, useSaveProfessional } from '../../hooks/useProData'
import { useProReviews } from '../../hooks/useShowcase'
import { initialValues, toProfessionalRow } from '../../lib/professionalForm'
import {
  availabilityLines,
  cleanAvailability,
  formatPhone,
  validateAccount,
  validateAvailability,
  type AccountErrors,
  type AccountValues,
  type Availability,
} from '../../lib/profile'
import { verificationStatus } from '../../lib/registry'
import { MODALITY_LABEL, specialtyLabel } from '../../lib/specialties'
import {
  acceptsReviews,
  initialShowcase,
  toShowcaseRow,
  validateShowcase,
  type ShowcaseErrors,
  type ShowcaseValues,
} from '../../lib/vitrine'

export function MeuPerfil() {
  const { profile, session, refreshProfile } = useAuth()
  const me = useMyProfessional()
  const phone = useMyPhone()
  const save = useSaveProfessional()
  const saveAccount = useSaveAccount()
  const email = session?.user.email ?? ''
  const [account, setAccount] = useState<AccountValues>({ email: '', phone: '', photo: { kind: 'keep' } })
  const [accountErrors, setAccountErrors] = useState<AccountErrors>({})
  const [availability, setAvailability] = useState<Availability>({})
  const [availabilityErrors, setAvailabilityErrors] = useState<Record<string, string>>({})
  const [showcase, setShowcase] = useState<ShowcaseValues>(() => initialShowcase())
  const [showcaseErrors, setShowcaseErrors] = useState<ShowcaseErrors>({})
  const reviews = useProReviews(session?.user.id, Boolean(me.data && acceptsReviews(me.data.specialty)))
  const location = useLocation()
  const [editing, setEditing] = useState(false)
  const [savedMsg, setSavedMsg] = useState<string | null>(
    (location.state as { justCreated?: boolean } | null)?.justCreated
      ? 'Perfil publicado! Você já aparece no “Perto de você”.'
      : null,
  )

  if (me.isLoading || phone.isLoading) return <Skeleton className="h-96" />
  if (me.error || !me.data) return <ErrorState message={me.error?.message} onRetry={() => me.refetch()} />
  const p = me.data
  const name = profile?.full_name ?? ''
  const status = verificationStatus(p)
  const demo = Boolean(profile?.is_demo)
  const hours = availabilityLines(p.availability)
  const savedPhone = phone.data ?? ''

  function startEditing() {
    setAccount({ email, phone: savedPhone, photo: { kind: 'keep' } })
    setAccountErrors({})
    setAvailability(p.availability ?? {})
    setAvailabilityErrors({})
    setShowcase(initialShowcase(p))
    setShowcaseErrors({})
    save.reset()
    saveAccount.reset()
    setSavedMsg(null)
    setEditing(true)
  }

  if (editing) {
    return (
      <section>
        <PageHeader title="Editar perfil" subtitle="As mudanças aparecem para os pacientes assim que você salvar." />
        <ProfessionalForm
          initial={initialValues(name, p)}
          submitLabel="Salvar alterações"
          saving={save.isPending || saveAccount.isPending}
          saveError={save.error?.message ?? saveAccount.error?.message}
          onCancel={() => {
            save.reset()
            saveAccount.reset()
            setEditing(false)
          }}
          top={
            <AccountSection
              name={name}
              seed={profile?.avatar_seed}
              savedPhoto={profile?.avatar_path}
              values={account}
              errors={accountErrors}
              demo={demo}
              photoLabel="Foto profissional"
              phoneNote="Privado: só você vê. Não aparece no seu perfil nem para os pacientes."
              onChange={(patch) => {
                setAccount((a) => ({ ...a, ...patch }))
                setAccountErrors((e) => ({
                  ...e,
                  ...('email' in patch ? { email: undefined } : {}),
                  ...('phone' in patch ? { phone: undefined } : {}),
                }))
              }}
            />
          }
          bottom={
            <>
              <ShowcaseEditor
                value={showcase}
                errors={showcaseErrors}
                demo={demo}
                onChange={(patch) => {
                  setShowcase((s) => ({ ...s, ...patch }))
                  setShowcaseErrors((e) => {
                    const next = { ...e }
                    for (const k of Object.keys(patch) as (keyof ShowcaseValues)[]) {
                      if (k === 'social') for (const n of Object.keys(patch.social ?? {})) delete next[n as keyof ShowcaseErrors]
                      else delete next[k as keyof ShowcaseErrors]
                    }
                    return next
                  })
                }}
              />
              <AvailabilityEditor
                value={availability}
                errors={availabilityErrors}
                onChange={(next) => {
                  setAvailability(next)
                  setAvailabilityErrors({})
                }}
              />
            </>
          }
          validateExtra={() => {
            const a = validateAccount(account, demo)
            const h = validateAvailability(availability)
            const sc = validateShowcase(showcase)
            setAccountErrors(a)
            setAvailabilityErrors(h)
            setShowcaseErrors(sc)
            return Object.keys(a).length === 0 && Object.keys(h).length === 0 && Object.keys(sc).length === 0
          }}
          onSubmit={async (v) => {
            const registryChanged = v.registry.trim() !== (p.registry ?? '') || v.specialty !== p.specialty
            let emailPending = false
            try {
              await save.mutateAsync({
                fullName: v.fullName,
                row: { ...toProfessionalRow(v), ...toShowcaseRow(showcase), availability: cleanAvailability(availability) },
                exists: true,
              })
              emailPending = (
                await saveAccount.mutateAsync({ fullName: v.fullName, email: account.email, phone: account.phone, photo: account.photo })
              ).emailPending
            } catch {
              return // o erro aparece no formulário
            }
            await refreshProfile()
            setEditing(false)
            window.scrollTo({ top: 0 })
            const emailNote = emailPending
              ? ` Para trocar o e-mail, abra o link de confirmação que enviamos para ${account.email.trim()}.`
              : ''
            setSavedMsg(
              (!registryChanged || status === 'pendente'
                ? 'Alterações salvas.'
                : status === 'aprovado'
                  ? 'Alterações salvas. Como o registro ou a especialidade mudou, o selo volta para verificação.'
                  : 'Alterações salvas. Seu registro voltou para verificação e você já aparece de novo na busca.') + emailNote,
            )
          }}
        />
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Meu perfil"
        subtitle="É assim que os pacientes te encontram."
        action={
          <button className="btn-outline px-4 py-2" onClick={startEditing}>
            <Pencil className="h-4 w-4" aria-hidden="true" /> Editar
          </button>
        }
      />

      <ProfileTabs />

      {savedMsg && (
        <p role="status" className="rounded-xl bg-lavender-soft px-3 py-2 text-sm text-primary">
          {savedMsg}
        </p>
      )}

      <div className="card flex items-center gap-4">
        <Avatar seed={profile?.avatar_seed} photo={profile?.avatar_path} name={name} size={72} />
        <div className="min-w-0">
          <p className="font-display text-xl font-bold">{name}</p>
          <p className="text-sm text-muted">{specialtyLabel(p.specialty)}</p>
          <p className="mt-1 flex items-center gap-1 text-xs font-semibold">
            {status === 'aprovado' ? (
              <span className="inline-flex items-center gap-1 text-primary">
                <BadgeCheck className="h-4 w-4" aria-hidden="true" /> Registro verificado
              </span>
            ) : status === 'recusado' ? (
              <span className="inline-flex items-center gap-1 text-attention">
                <CircleX className="h-4 w-4" aria-hidden="true" /> Registro recusado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-muted">
                <Clock className="h-4 w-4" aria-hidden="true" /> Registro em verificação
              </span>
            )}
          </p>
          {p.registry && <p className="text-xs text-muted">{p.registry}</p>}
        </div>
      </div>

      {status === 'recusado' && (
        <div role="alert" className="card space-y-3 border border-attention-soft">
          <h2 className="font-semibold text-attention">A equipe Skyro não conseguiu confirmar seu registro</h2>
          <p className="text-sm">
            <span className="font-semibold">Motivo:</span> {p.rejection_reason}
          </p>
          <p className="text-sm text-muted">
            Enquanto isso, seu perfil não aparece na busca. Corrija o registro ou a especialidade e ele volta para
            verificação na hora.
          </p>
          <button className="btn-primary w-full sm:w-auto" onClick={startEditing}>
            <Pencil className="h-4 w-4" aria-hidden="true" /> Corrigir registro
          </button>
        </div>
      )}

      <div className="card space-y-2">
        <h2 className="eyebrow">Sobre você</h2>
        <p className="text-sm leading-relaxed">{p.bio}</p>
      </div>

      {p.tags.length > 0 && (
        <div className="card space-y-2">
          <h2 className="eyebrow">Especialidades</h2>
          <div className="flex flex-wrap gap-1.5">
            {p.tags.map((t) => (
              <span key={t} className="chip text-sm">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      <ExperienceCard pro={p} emptyHint="Conte onde se formou, há quantos anos atua e suas experiências. Toque em Editar." />

      <SocialButtons links={p.social_links ?? {}} firstName={name.split(' ')[0]} />

      <div className="card space-y-2">
        <h2 className="eyebrow">Como você atende</h2>
        <p className="text-sm font-semibold">{MODALITY_LABEL[p.modality]}</p>
        {p.neighborhood && (
          <p className="inline-flex items-center gap-1 text-sm text-muted">
            <MapPin className="h-4 w-4" aria-hidden="true" /> {p.neighborhood}, {p.city}
          </p>
        )}
      </div>

      <div className="card space-y-2">
        <h2 className="eyebrow">Horários de atendimento</h2>
        {hours.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {hours.map((h) => (
              <li key={h.days} className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-muted" aria-hidden="true" />
                <span className="font-semibold">{h.days}</span>
                <span className="text-muted">{h.hours}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Você ainda não informou seus horários. Toque em Editar para adicionar.</p>
        )}
      </div>

      <div className="card space-y-3">
        <h2 className="eyebrow">Avaliações</h2>
        {!acceptsReviews(p.specialty) ? (
          <p className="text-sm text-muted">
            Psicólogos não recebem avaliações públicas na Skyro, por cautela com as regras do Conselho Federal de Psicologia.
          </p>
        ) : reviews.data && reviews.data.length > 0 ? (
          <>
            <RatingSummary rating={p.rating} count={p.reviews_count} reviews={reviews.data} />
            <ul className="space-y-3 border-t border-line pt-3">
              {reviews.data.map((r) => (
                <ReviewItem key={r.id} review={r} />
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-muted">
            {reviews.isLoading
              ? 'Carregando…'
              : 'Ainda sem avaliações. Quem compartilha a rotina com você pode deixar uma nota e um comentário no seu perfil.'}
          </p>
        )}
      </div>

      <div className="card space-y-2">
        <h2 className="eyebrow">Contato</h2>
        <p className="text-sm">{email}</p>
        <p className="text-sm">{savedPhone ? formatPhone(savedPhone) : <span className="text-muted">Sem telefone</span>}</p>
        <p className="flex items-start gap-1.5 text-xs text-muted">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Privado: os pacientes não veem seu e-mail nem seu telefone.
        </p>
      </div>

      <Link to="/pro/configuracoes" className="tap gap-1 text-sm font-semibold text-primary">
        Aparência e conta em Configurações <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Link>

      <div className="lg:hidden">
        <SignOutButton />
      </div>
      <DemoBanner />
    </section>
  )
}
