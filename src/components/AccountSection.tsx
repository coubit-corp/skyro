import { Camera, Lock, Trash2 } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { toAvatarJpeg } from '../lib/image'
import { formatPhone, validatePhotoFile, type AccountErrors, type AccountValues } from '../lib/profile'
import { Avatar } from './Avatar'
import { Modal } from './ui'

/** Foto, e-mail e telefone: a parte do perfil que é igual para pessoa e profissional. */
export function AccountSection({
  name,
  seed,
  savedPhoto,
  values,
  errors,
  onChange,
  demo,
  photoLabel = 'Foto de perfil',
  phoneNote = 'Privado: só você vê. Não aparece no seu perfil nem para quem acompanha sua rotina.',
}: {
  name: string
  seed: string | null | undefined
  /** Caminho da foto já salva (profiles.avatar_path) */
  savedPhoto: string | null | undefined
  values: AccountValues
  errors: AccountErrors
  onChange: (patch: Partial<AccountValues>) => void
  /** Conta demo: foto, e-mail e telefone ficam travados */
  demo: boolean
  photoLabel?: string
  /** Aviso de privacidade embaixo do telefone */
  phoneNote?: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const emailId = useId()
  const phoneId = useId()
  const photoMsgId = useId()

  // Libera a prévia da memória quando ela é trocada ou a tela fecha.
  const previewUrl = values.photo.kind === 'new' ? values.photo.previewUrl : null
  useEffect(() => () => void (previewUrl && URL.revokeObjectURL(previewUrl)), [previewUrl])

  const hasPhoto = values.photo.kind === 'new' || (values.photo.kind === 'keep' && Boolean(savedPhoto))

  async function pick(file: File | undefined) {
    if (!file) return
    setPhotoError(validatePhotoFile(file))
    if (validatePhotoFile(file)) return
    setPreparing(true)
    try {
      const blob = await toAvatarJpeg(file)
      onChange({ photo: { kind: 'new', blob, previewUrl: URL.createObjectURL(blob) } })
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Não deu para usar essa imagem.')
    } finally {
      setPreparing(false)
      if (fileRef.current) fileRef.current.value = '' // permite escolher o mesmo arquivo de novo
    }
  }

  return (
    <>
      <div className="card space-y-3">
        <h2 className="eyebrow">{photoLabel}</h2>
        <div className="flex items-center gap-4">
          <Avatar
            seed={seed}
            name={name || 'você'}
            size={88}
            photo={values.photo.kind === 'keep' ? savedPhoto : null}
            src={previewUrl}
          />
          <div className="min-w-0 flex-1 space-y-2">
            {demo ? (
              <p className="flex items-start gap-2 text-sm text-muted">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                Esta é uma conta de demonstração, usada por várias pessoas. Para enviar uma foto, crie a sua conta.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-outline px-4" onClick={() => fileRef.current?.click()} disabled={preparing}>
                    <Camera className="h-4 w-4" aria-hidden="true" />
                    {preparing ? 'Preparando…' : hasPhoto ? 'Trocar foto' : 'Enviar foto'}
                  </button>
                  {hasPhoto && (
                    <button
                      type="button"
                      className="btn px-4 text-attention hover:bg-attention-soft"
                      onClick={() => setConfirmRemove(true)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" /> Remover
                    </button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  tabIndex={-1}
                  aria-label="Escolher foto de perfil"
                  aria-describedby={photoMsgId}
                  onChange={(e) => pick(e.target.files?.[0])}
                />
                <p id={photoMsgId} className={`text-xs ${photoError ? 'font-medium text-attention' : 'text-muted'}`} role={photoError ? 'alert' : undefined}>
                  {photoError ??
                    (values.photo.kind === 'new'
                      ? 'Foto nova pronta. Ela aparece para os outros quando você salvar.'
                      : values.photo.kind === 'remove'
                        ? 'A foto sai quando você salvar. Você volta a aparecer com o avatar ilustrado.'
                        : 'JPG, PNG ou WebP. A foto é recortada num quadrado e reduzida antes de enviar.')}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="eyebrow">Contato</h2>
        <div className="space-y-1.5">
          <label htmlFor={emailId} className="text-sm font-semibold">
            E-mail
          </label>
          <input
            id={emailId}
            type="email"
            className="input disabled:bg-surface disabled:text-muted"
            autoComplete="email"
            inputMode="email"
            value={values.email}
            disabled={demo}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={`${emailId}-msg`}
            onChange={(e) => onChange({ email: e.target.value })}
          />
          <p id={`${emailId}-msg`} className={`text-xs ${errors.email ? 'font-medium text-attention' : 'text-muted'}`} role={errors.email ? 'alert' : undefined}>
            {errors.email ??
              (demo
                ? 'O e-mail da conta de demonstração não pode ser trocado.'
                : 'É o e-mail que você usa para entrar. Se trocar, enviamos um link de confirmação para o novo endereço.')}
          </p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={phoneId} className="text-sm font-semibold">
            Telefone <span className="font-normal text-muted">(opcional)</span>
          </label>
          <input
            id={phoneId}
            type="tel"
            className="input disabled:bg-surface disabled:text-muted"
            autoComplete="tel-national"
            inputMode="tel"
            placeholder="(11) 98765-4321"
            value={formatPhone(values.phone)}
            disabled={demo}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={`${phoneId}-msg`}
            onChange={(e) => onChange({ phone: e.target.value })}
          />
          <p id={`${phoneId}-msg`} className={`flex items-start gap-1.5 text-xs ${errors.phone ? 'font-medium text-attention' : 'text-muted'}`} role={errors.phone ? 'alert' : undefined}>
            {!errors.phone && <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
            {errors.phone ??
              (demo
                ? 'A conta de demonstração não guarda telefone.'
                : phoneNote)}
          </p>
        </div>
      </div>

      <Modal open={confirmRemove} onClose={() => setConfirmRemove(false)} title="Remover sua foto?">
        <p className="text-sm text-muted">
          Você volta a aparecer com o avatar ilustrado em todas as telas. A foto só é removida de vez quando você tocar em
          “Salvar alterações”.
        </p>
        <div className="flex gap-2">
          <button type="button" className="btn-outline flex-1" onClick={() => setConfirmRemove(false)}>
            Manter foto
          </button>
          <button
            type="button"
            className="btn-primary flex-1"
            onClick={() => {
              onChange({ photo: { kind: 'remove' } })
              setPhotoError(null)
              setConfirmRemove(false)
            }}
          >
            Remover foto
          </button>
        </div>
      </Modal>
    </>
  )
}
