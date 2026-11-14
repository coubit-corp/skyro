import { X } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import type { Modality, Specialty } from '../lib/database.types'
import { MODALITY_LABEL, SPECIALTIES } from '../lib/specialties'
import {
  addTag,
  BIO_MAX,
  needsLocation,
  REGISTRY_EXAMPLE,
  TAGS_MAX,
  validateProfessional,
  type FormErrors,
  type ProfessionalFormValues,
} from '../lib/professionalForm'
import { LocationPicker } from './LocationPicker'

function Field({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="eyebrow">{label}</p>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs font-medium text-attention">
          {error}
        </p>
      )}
    </div>
  )
}

const MODALITIES: Modality[] = ['presencial', 'online', 'ambos']

export function ProfessionalForm({
  initial,
  submitLabel,
  saving,
  saveError,
  onSubmit,
  onCancel,
}: {
  initial: ProfessionalFormValues
  submitLabel: string
  saving: boolean
  saveError?: string | null
  onSubmit: (v: ProfessionalFormValues) => void
  onCancel?: () => void
}) {
  const [v, setV] = useState(initial)
  const [errors, setErrors] = useState<FormErrors>({})
  const [tagDraft, setTagDraft] = useState('')
  /** Tira o erro de um campo assim que a pessoa mexe nele. */
  const clearError = (...keys: (keyof FormErrors)[]) =>
    setErrors((e) => {
      if (!keys.some((k) => k in e)) return e
      const next = { ...e }
      keys.forEach((k) => delete next[k])
      return next
    })
  const set = <K extends keyof ProfessionalFormValues>(k: K, val: ProfessionalFormValues[K]) => {
    setV((s) => ({ ...s, [k]: val }))
    clearError(k, ...(k === 'modality' ? (['location', 'neighborhood'] as const) : []))
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const found = validateProfessional(v)
    setErrors(found)
    if (Object.keys(found).length === 0) onSubmit(v)
    else document.querySelector('[role="alert"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function commitTag() {
    clearError('tags')
    setV((s) => ({ ...s, tags: addTag(s.tags, tagDraft) }))
    setTagDraft('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="card space-y-4">
        <Field label="Seu nome" error={errors.fullName}>
          <input className="input" autoComplete="name" value={v.fullName} onChange={(e) => set('fullName', e.target.value)} />
        </Field>

        <Field label="Especialidade" error={errors.specialty}>
          <div className="grid grid-cols-2 gap-2">
            {SPECIALTIES.map((s) => (
              <label
                key={s.value}
                className={`flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${
                  v.specialty === s.value ? 'border-primary bg-lavender-soft text-primary' : 'border-line bg-card'
                }`}
              >
                <input
                  type="radio"
                  name="specialty"
                  className="sr-only"
                  checked={v.specialty === s.value}
                  onChange={() => set('specialty', s.value)}
                />
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-lavender-soft text-primary">{s.letter}</span>
                {s.value === 'fisioterapeuta' ? 'Fisioterapeuta' : s.label}
              </label>
            ))}
          </div>
        </Field>

        <Field
          label="Registro no conselho"
          error={errors.registry}
          hint="Fica como “em verificação” até a equipe da Skyro conferir. Trocar o registro depois volta para verificação."
        >
          <input
            className="input"
            placeholder={v.specialty ? `Ex.: ${REGISTRY_EXAMPLE[v.specialty as Specialty]}` : 'Ex.: CRN-3 12345'}
            value={v.registry}
            maxLength={40}
            onChange={(e) => set('registry', e.target.value)}
          />
        </Field>
      </div>

      <div className="card space-y-4">
        <Field label="Sobre você" error={errors.bio} hint="É o que o paciente lê no seu perfil.">
          <textarea
            className="input min-h-28 resize-y"
            maxLength={BIO_MAX}
            placeholder="Ex.: Trabalho com alimentação para quem treina e tem rotina corrida…"
            value={v.bio}
            onChange={(e) => set('bio', e.target.value)}
          />
          <p className="text-right text-xs text-muted">
            {v.bio.length} / {BIO_MAX}
          </p>
        </Field>

        <Field label={`Especialidades (até ${TAGS_MAX})`} error={errors.tags}>
          <div className="flex flex-wrap gap-2">
            {v.tags.map((t) => (
              <span key={t} className="chip gap-1 py-1.5 text-sm">
                {t}
                <button type="button" aria-label={`Remover ${t}`} onClick={() => set('tags', v.tags.filter((x) => x !== t))}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
          {v.tags.length < TAGS_MAX && (
            <div className="flex gap-2">
              <input
                className="input"
                placeholder="Ex.: Nutrição esportiva"
                value={tagDraft}
                maxLength={30}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault()
                    commitTag()
                  }
                }}
                aria-label="Nova especialidade"
              />
              <button type="button" className="btn-outline shrink-0 px-4" onClick={commitTag} disabled={tagDraft.trim().length < 2}>
                + Adicionar
              </button>
            </div>
          )}
        </Field>
      </div>

      <div className="card space-y-4">
        <Field label="Como você atende">
          <div className="grid grid-cols-3 gap-2" role="radiogroup">
            {MODALITIES.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={v.modality === m}
                onClick={() => set('modality', m)}
                className={`rounded-2xl border px-2 py-2.5 text-sm font-semibold transition ${
                  v.modality === m ? 'border-primary bg-lavender-soft text-primary' : 'border-line bg-card'
                }`}
              >
                {m === 'online' ? 'Só online' : MODALITY_LABEL[m]}
              </button>
            ))}
          </div>
        </Field>

        {needsLocation(v.modality) ? (
          <>
            <Field label="Onde você atende" error={errors.location}>
              <LocationPicker
                lat={v.lat}
                lng={v.lng}
                onChange={(loc) => {
                  clearError('location', ...(loc.neighborhood ? (['neighborhood'] as const) : []))
                  setV((s) => ({
                    ...s,
                    lat: loc.lat,
                    lng: loc.lng,
                    neighborhood: loc.neighborhood || s.neighborhood,
                    city: loc.city || s.city,
                  }))
                }}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Bairro" error={errors.neighborhood}>
                <input className="input" value={v.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} />
              </Field>
              <Field label="Cidade">
                <input className="input" value={v.city} onChange={(e) => set('city', e.target.value)} />
              </Field>
            </div>
            <p className="text-xs text-muted">Os pacientes veem o pino no mapa, o bairro e a distância até você. Se preferir não mostrar o endereço exato, marque um ponto próximo, como a esquina.</p>
          </>
        ) : (
          <p className="text-sm text-muted">
            Você aparece na lista do “Perto de você” como <strong className="text-ink">atendimento online</strong>, para
            pacientes de qualquer lugar.
          </p>
        )}
      </div>

      {saveError && (
        <p role="alert" className="rounded-xl bg-attention-soft px-3 py-2 text-sm text-attention">
          Não deu para salvar: {saveError}
        </p>
      )}
      <div className={`grid gap-2 ${onCancel ? 'grid-cols-2' : ''}`}>
        {onCancel && (
          <button type="button" className="btn-outline" onClick={onCancel} disabled={saving}>
            Cancelar
          </button>
        )}
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Salvando…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
