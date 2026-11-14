import { CheckCircle2 } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/auth-context'
import { AccountSection } from '../../components/AccountSection'
import { DemoBanner } from '../../components/DemoBanner'
import { SignOutButton } from '../../components/SignOutButton'
import { ErrorState, PageHeader, Skeleton } from '../../components/ui'
import { useMyPhone, useSaveAccount } from '../../hooks/useAccount'
import type { Profile } from '../../lib/database.types'
import {
  NAME_MAX,
  PERSON_BIO_MAX,
  validateAccount,
  validateName,
  validatePersonBio,
  type AccountErrors,
  type AccountValues,
} from '../../lib/profile'

/** Configurações de perfil da pessoa. */
export function Perfil() {
  const { profile, session } = useAuth()
  const phone = useMyPhone()

  if (!profile || !session || phone.isLoading) return <Skeleton className="h-96" />
  if (phone.error) return <ErrorState message={phone.error.message} onRetry={() => phone.refetch()} />
  return <PerfilForm profile={profile} email={session.user.email ?? ''} phone={phone.data ?? ''} />
}

type Saved = { emailPending: boolean; email: string } | null

function PerfilForm({ profile, email, phone }: { profile: Profile; email: string; phone: string }) {
  const save = useSaveAccount()
  const initialAccount = (): AccountValues => ({ email, phone, photo: { kind: 'keep' } })
  const [fullName, setFullName] = useState(profile.full_name)
  const [bio, setBio] = useState(profile.bio ?? '')
  const [account, setAccount] = useState<AccountValues>(initialAccount)
  const [errors, setErrors] = useState<AccountErrors & { fullName?: string; bio?: string }>({})
  const [saved, setSaved] = useState<Saved>(null)
  const nameId = useId()
  const bioId = useId()

  const dirty =
    fullName !== profile.full_name ||
    bio !== (profile.bio ?? '') ||
    account.email !== email ||
    account.phone !== phone ||
    account.photo.kind !== 'keep'

  function reset() {
    setFullName(profile.full_name)
    setBio(profile.bio ?? '')
    setAccount(initialAccount())
    setErrors({})
    save.reset()
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaved(null)
    const found: typeof errors = { ...validateAccount(account, profile.is_demo) }
    const nameError = validateName(fullName)
    const bioError = validatePersonBio(bio)
    if (nameError) found.fullName = nameError
    if (bioError) found.bio = bioError
    setErrors(found)
    if (Object.keys(found).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    try {
      const result = await save.mutateAsync({ fullName, bio, email: account.email, phone: account.phone, photo: account.photo })
      // A foto e o e-mail voltam ao estado "sem mudança"; o resto já está salvo.
      setAccount((a) => ({ ...a, email: result.emailPending ? email : a.email, photo: { kind: 'keep' } }))
      setSaved({ emailPending: result.emailPending, email: account.email.trim() })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      /* a mensagem aparece acima dos botões */
    }
  }

  return (
    <section>
      <PageHeader
        title="Meu perfil"
        subtitle="Seus dados na Skyro. Nome e foto aparecem para os profissionais que acompanham sua rotina."
        back={{ to: '/inicio', label: 'Início' }}
      />

      {saved && (
        <div role="status" className="mb-4 flex items-start gap-2 rounded-xl bg-lavender-soft px-3 py-2.5 text-sm text-primary">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            <span className="font-semibold">Alterações salvas.</span>
            {saved.emailPending &&
              ` Para trocar o e-mail, abra o link de confirmação que enviamos para ${saved.email}. Até lá, você continua entrando com o e-mail atual.`}
          </p>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4" noValidate>
        <AccountSection
          name={fullName}
          seed={profile.avatar_seed}
          savedPhoto={profile.avatar_path}
          values={account}
          errors={errors}
          demo={profile.is_demo}
          onChange={(patch) => {
            setAccount((a) => ({ ...a, ...patch }))
            setErrors((er) => ({ ...er, ...('email' in patch ? { email: undefined } : {}), ...('phone' in patch ? { phone: undefined } : {}) }))
          }}
        />

        <div className="card space-y-4">
          <h2 className="eyebrow">Sobre você</h2>
          <div className="space-y-1.5">
            <label htmlFor={nameId} className="text-sm font-semibold">
              Nome completo
            </label>
            <input
              id={nameId}
              className="input"
              autoComplete="name"
              maxLength={NAME_MAX}
              value={fullName}
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? `${nameId}-msg` : undefined}
              onChange={(e) => {
                setFullName(e.target.value)
                setErrors((er) => ({ ...er, fullName: undefined }))
              }}
            />
            {errors.fullName && (
              <p id={`${nameId}-msg`} role="alert" className="text-xs font-medium text-attention">
                {errors.fullName}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label htmlFor={bioId} className="text-sm font-semibold">
              Bio <span className="font-normal text-muted">(opcional)</span>
            </label>
            <textarea
              id={bioId}
              className="input min-h-24 resize-y"
              maxLength={PERSON_BIO_MAX}
              placeholder="Ex.: Trabalho sentado o dia todo e quero voltar a correr."
              value={bio}
              aria-invalid={Boolean(errors.bio)}
              aria-describedby={`${bioId}-msg`}
              onChange={(e) => {
                setBio(e.target.value)
                setErrors((er) => ({ ...er, bio: undefined }))
              }}
            />
            <p id={`${bioId}-msg`} className={`flex justify-between gap-2 text-xs ${errors.bio ? 'font-medium text-attention' : 'text-muted'}`}>
              <span>{errors.bio ?? 'Quem acompanha sua rotina lê isso para te conhecer melhor.'}</span>
              <span className="shrink-0">
                {bio.length} / {PERSON_BIO_MAX}
              </span>
            </p>
          </div>
        </div>

        {save.isError && (
          <p role="alert" className="rounded-xl bg-attention-soft px-3 py-2 text-sm text-attention">
            Não deu para salvar: {save.error.message}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn-outline" onClick={reset} disabled={!dirty || save.isPending}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={!dirty || save.isPending}>
            {save.isPending ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>
      </form>

      <div className="mt-6 lg:hidden">
        <SignOutButton />
      </div>
      <DemoBanner />
    </section>
  )
}
