import { X } from 'lucide-react'
import { useId, useState } from 'react'
import {
  addExperience,
  EDUCATION_MAX,
  EXPERIENCE_MAX_LEN,
  EXPERIENCES_MAX,
  SOCIAL_NETWORKS,
  type ShowcaseErrors,
  type ShowcaseValues,
} from '../lib/vitrine'
import { SocialIcon } from './Showcase'

function ErrorText({ id, error }: { id: string; error?: string }) {
  return error ? (
    <p id={id} role="alert" className="text-xs font-medium text-attention">
      {error}
    </p>
  ) : null
}

/**
 * Formação, experiência, idade e redes sociais, no "Editar perfil" do
 * profissional. Controlado como o AvailabilityEditor: quem salva é a página.
 */
export function ShowcaseEditor({
  value,
  errors,
  demo,
  onChange,
}: {
  value: ShowcaseValues
  errors: ShowcaseErrors
  demo: boolean
  onChange: (patch: Partial<ShowcaseValues>) => void
}) {
  const [draft, setDraft] = useState('')
  const id = useId()
  const commit = () => {
    onChange({ experiences: addExperience(value.experiences, draft) })
    setDraft('')
  }

  return (
    <>
      <fieldset className="card space-y-4">
        <legend className="eyebrow float-left mb-1 w-full">Formação e experiência</legend>
        <p className="clear-both text-xs text-muted">Tudo opcional. Ajuda o paciente a conhecer sua trajetória.</p>

        <div className="space-y-1.5">
          <label htmlFor={`${id}-edu`} className="text-sm font-semibold">
            Onde se formou
          </label>
          <input
            id={`${id}-edu`}
            className="input"
            maxLength={EDUCATION_MAX}
            placeholder="Ex.: Nutrição pela USP"
            value={value.education}
            aria-invalid={Boolean(errors.education)}
            aria-describedby={errors.education ? `${id}-edu-msg` : undefined}
            onChange={(e) => onChange({ education: e.target.value })}
          />
          <ErrorText id={`${id}-edu-msg`} error={errors.education} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor={`${id}-years`} className="text-sm font-semibold">
              Anos na área
            </label>
            <input
              id={`${id}-years`}
              className="input"
              inputMode="numeric"
              maxLength={2}
              placeholder="Ex.: 8"
              value={value.yearsExperience}
              aria-invalid={Boolean(errors.yearsExperience)}
              aria-describedby={errors.yearsExperience ? `${id}-years-msg` : undefined}
              onChange={(e) => onChange({ yearsExperience: e.target.value.replace(/\D/g, '') })}
            />
            <ErrorText id={`${id}-years-msg`} error={errors.yearsExperience} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${id}-birth`} className="text-sm font-semibold">
              Ano de nascimento
            </label>
            <input
              id={`${id}-birth`}
              className="input"
              inputMode="numeric"
              maxLength={4}
              placeholder="Ex.: 1990"
              value={value.birthYear}
              aria-invalid={Boolean(errors.birthYear)}
              aria-describedby={`${id}-birth-msg`}
              onChange={(e) => onChange({ birthYear: e.target.value.replace(/\D/g, '') })}
            />
            {errors.birthYear ? (
              <ErrorText id={`${id}-birth-msg`} error={errors.birthYear} />
            ) : (
              <p id={`${id}-birth-msg`} className="text-xs text-muted">
                No perfil aparece só a idade.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2" role="group" aria-labelledby={`${id}-exp`}>
          <p id={`${id}-exp`} className="text-sm font-semibold">
            Experiências <span className="font-normal text-muted">(até {EXPERIENCES_MAX})</span>
          </p>
          {value.experiences.length > 0 && (
            <ul className="space-y-1.5">
              {value.experiences.map((e) => (
                <li key={e} className="flex items-center gap-2 rounded-xl bg-chip py-1 pl-3 text-sm">
                  <span className="min-w-0 flex-1">{e}</span>
                  <button
                    type="button"
                    className="flex h-9 w-9 shrink-0 items-center justify-center"
                    aria-label={`Remover ${e}`}
                    onClick={() => onChange({ experiences: value.experiences.filter((x) => x !== e) })}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {value.experiences.length < EXPERIENCES_MAX && (
            <div className="flex gap-2">
              <input
                className="input"
                placeholder="Ex.: Pós em Nutrição Esportiva"
                value={draft}
                maxLength={EXPERIENCE_MAX_LEN}
                aria-label="Nova experiência"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    commit()
                  }
                }}
              />
              <button type="button" className="btn-outline shrink-0 px-4" onClick={commit} disabled={draft.trim().length < 2}>
                + Adicionar
              </button>
            </div>
          )}
        </div>
      </fieldset>

      <fieldset className="card space-y-3">
        <legend className="eyebrow float-left mb-1 w-full">Redes sociais</legend>
        {demo ? (
          <p className="clear-both text-sm text-muted">
            Contas de demonstração não colocam links de redes sociais. Numa conta de verdade, os pacientes veem botões
            para abrir seu Instagram, Facebook e outras redes.
          </p>
        ) : (
          <>
            <p className="clear-both text-xs text-muted">
              Aparecem como botões no seu perfil. Pode colar o link ou, no Instagram e no TikTok, só o @.
            </p>
            {SOCIAL_NETWORKS.map(({ key, label, placeholder }) => (
              <div key={key} className="space-y-1">
                <label htmlFor={`${id}-${key}`} className="flex items-center gap-2 text-sm font-semibold">
                  <SocialIcon network={key} className="h-4 w-4 text-primary" /> {label}
                </label>
                <input
                  id={`${id}-${key}`}
                  className="input"
                  inputMode="url"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={placeholder}
                  value={value.social[key] ?? ''}
                  aria-invalid={Boolean(errors[key])}
                  aria-describedby={errors[key] ? `${id}-${key}-msg` : undefined}
                  onChange={(e) => onChange({ social: { ...value.social, [key]: e.target.value } })}
                />
                <ErrorText id={`${id}-${key}-msg`} error={errors[key]} />
              </div>
            ))}
          </>
        )}
      </fieldset>
    </>
  )
}
