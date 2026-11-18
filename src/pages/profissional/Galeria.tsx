import { ImagePlus, Link2, Video } from 'lucide-react'
import { useId, useRef, useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/auth-context'
import { MediaGrid } from '../../components/Showcase'
import { ErrorState, Modal, Skeleton } from '../../components/ui'
import { useAddMedia, useDeleteMedia, useProMedia, type NewMedia } from '../../hooks/useShowcase'
import type { ProfessionalMedia } from '../../lib/database.types'
import { CAPTION_MAX, MEDIA_MAX, parseVideoLink, PROVIDER_LABEL } from '../../lib/vitrine'

type Draft = { kind: 'foto' | 'video'; file: File; preview: string } | { kind: 'link' }

/** "Fotos e vídeos", aba do perfil em Configurações: o profissional mostra como atende. */
export function Galeria() {
  const { session, profile } = useAuth()
  const media = useProMedia(session?.user.id)
  const add = useAddMedia()
  const remove = useDeleteMedia()
  const demo = Boolean(profile?.is_demo)
  const photoInput = useRef<HTMLInputElement>(null)
  const videoInput = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [caption, setCaption] = useState('')
  const [link, setLink] = useState('')
  const [linkError, setLinkError] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<ProfessionalMedia | null>(null)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const captionId = useId()
  const linkId = useId()

  const items = media.data ?? []
  const full = items.length >= MEDIA_MAX
  const parsed = link.trim() ? parseVideoLink(link) : null

  function closeDraft() {
    if (draft && draft.kind !== 'link') URL.revokeObjectURL(draft.preview)
    setDraft(null)
    setCaption('')
    setLink('')
    setLinkError(null)
    add.reset()
  }

  function pickFile(kind: 'foto' | 'video', file: File | undefined) {
    if (!file) return
    setSavedMsg(null)
    add.reset()
    setDraft({ kind, file, preview: URL.createObjectURL(file) })
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!draft) return
    let input: NewMedia
    if (draft.kind === 'link') {
      if (!parsed) {
        setLinkError('Cole o link de um vídeo do YouTube, do Google Drive ou do Vimeo.')
        return
      }
      input = { kind: 'link', ref: parsed, caption }
    } else {
      input = { kind: draft.kind, file: draft.file, caption }
    }
    try {
      await add.mutateAsync(input)
      setSavedMsg(draft.kind === 'foto' ? 'Foto publicada no seu perfil.' : 'Vídeo publicado no seu perfil.')
      closeDraft()
    } catch {
      /* a mensagem aparece no formulário */
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">Fotos e vídeos</h2>
        <p className="text-sm text-muted">Mostre seu trabalho: fotos e vídeos atendendo seus pacientes.</p>
      </div>

      {savedMsg && (
        <p role="status" className="rounded-xl bg-lavender-soft px-3 py-2 text-sm text-primary">
          {savedMsg}
        </p>
      )}

      <div className="card space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="eyebrow">Adicionar</h2>
          <span className="text-xs text-muted">
            {items.length} de {MEDIA_MAX}
          </span>
        </div>
        {demo ? (
          <p className="text-sm text-muted">
            Contas de demonstração não enviam fotos nem vídeos (qualquer pessoa entra nelas). Numa conta de verdade, você
            publica aqui fotos e vídeos dos seus atendimentos ou o link de um vídeo do YouTube, do Google Drive ou do Vimeo.
          </p>
        ) : full ? (
          <p className="text-sm text-muted">Sua galeria está cheia. Apague um item para colocar outro.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button type="button" className="btn-outline gap-2" onClick={() => photoInput.current?.click()}>
                <ImagePlus className="h-5 w-5" aria-hidden="true" /> Foto
              </button>
              <button type="button" className="btn-outline gap-2" onClick={() => videoInput.current?.click()}>
                <Video className="h-5 w-5" aria-hidden="true" /> Vídeo do aparelho
              </button>
              <button
                type="button"
                className="btn-outline gap-2"
                onClick={() => {
                  setSavedMsg(null)
                  add.reset()
                  setDraft({ kind: 'link' })
                }}
              >
                <Link2 className="h-5 w-5" aria-hidden="true" /> Link de vídeo
              </button>
            </div>
            <p className="text-xs text-muted">
              Fotos em JPG, PNG ou WebP (reduzimos no seu aparelho antes de enviar). Vídeos em MP4, MOV ou WebM de até 50 MB.
              Para vídeos maiores, publique no YouTube ou no Google Drive e cole o link.
            </p>
            <p className="text-xs text-muted">
              Só publique imagens de pacientes que autorizaram, de preferência por escrito.
            </p>
            <input
              ref={photoInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                pickFile('foto', e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <input
              ref={videoInput}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                pickFile('video', e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </>
        )}
      </div>

      {media.isLoading ? (
        <Skeleton className="h-64" />
      ) : media.error ? (
        <ErrorState message={media.error.message} onRetry={() => media.refetch()} />
      ) : items.length === 0 ? (
        <div className="card text-center text-sm text-muted">
          Nada por aqui ainda. Fotos e vídeos dos seus atendimentos ajudam o paciente a escolher você.
        </div>
      ) : (
        <>
          {remove.isError && (
            <p role="alert" className="rounded-xl bg-attention-soft px-3 py-2 text-sm text-attention">
              Não deu para apagar: {remove.error.message}
            </p>
          )}
          <MediaGrid items={items} onDelete={setToDelete} deletingId={remove.isPending ? remove.variables?.id : null} />
        </>
      )}

      <Modal
        open={draft !== null}
        onClose={closeDraft}
        title={draft?.kind === 'foto' ? 'Nova foto' : draft?.kind === 'video' ? 'Novo vídeo' : 'Vídeo por link'}
      >
        <form onSubmit={submit} className="space-y-4">
          {draft?.kind === 'foto' && <img src={draft.preview} alt="Prévia da foto" className="max-h-64 w-full rounded-xl object-contain" />}
          {draft?.kind === 'video' && (
            <video src={draft.preview} controls playsInline className="max-h-64 w-full rounded-xl bg-black" aria-label="Prévia do vídeo" />
          )}
          {draft?.kind === 'link' && (
            <div className="space-y-1.5">
              <label htmlFor={linkId} className="text-sm font-semibold">
                Link do vídeo
              </label>
              <input
                id={linkId}
                className="input"
                inputMode="url"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="youtube.com/watch?v=… ou drive.google.com/…"
                value={link}
                aria-invalid={Boolean(linkError)}
                aria-describedby={`${linkId}-msg`}
                onChange={(e) => {
                  setLink(e.target.value)
                  setLinkError(null)
                }}
              />
              <p id={`${linkId}-msg`} className={`text-xs ${linkError ? 'font-medium text-attention' : 'text-muted'}`} role={linkError ? 'alert' : undefined}>
                {linkError ??
                  (parsed
                    ? `Vídeo do ${PROVIDER_LABEL[parsed.provider]} reconhecido.`
                    : 'YouTube, Google Drive (com acesso para "qualquer pessoa com o link") ou Vimeo.')}
              </p>
            </div>
          )}
          <div className="space-y-1.5">
            <label htmlFor={captionId} className="text-sm font-semibold">
              Legenda <span className="font-normal text-muted">(opcional)</span>
            </label>
            <input
              id={captionId}
              className="input"
              maxLength={CAPTION_MAX}
              placeholder="Ex.: Treino funcional no parque"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>
          {add.isError && (
            <p role="alert" className="rounded-xl bg-attention-soft px-3 py-2 text-sm text-attention">
              Não deu para publicar: {add.error.message}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn-outline" onClick={closeDraft} disabled={add.isPending}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={add.isPending || (draft?.kind === 'link' && !link.trim())}>
              {add.isPending ? (draft?.kind === 'link' ? 'Salvando…' : 'Enviando…') : 'Publicar'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={toDelete !== null} onClose={() => setToDelete(null)} title="Apagar da galeria?">
        <p className="text-sm">
          {toDelete?.kind === 'foto' ? 'A foto' : 'O vídeo'} sai do seu perfil na hora.
          {toDelete?.kind === 'link' ? ' O vídeo original continua no site de onde veio.' : ''}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-outline" onClick={() => setToDelete(null)}>
            Cancelar
          </button>
          <button
            className="btn-primary bg-attention hover:bg-attention/90"
            onClick={() => {
              if (toDelete) remove.mutate(toDelete)
              setToDelete(null)
              setSavedMsg(null)
            }}
          >
            Apagar
          </button>
        </div>
      </Modal>
    </section>
  )
}
