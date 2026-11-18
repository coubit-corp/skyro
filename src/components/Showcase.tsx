// Peças da vitrine do profissional, usadas no "Meu perfil" dele e no perfil
// que a pessoa vê: formação e experiência, redes sociais, galeria de fotos e
// vídeos e avaliações.

import { Briefcase, Cake, ExternalLink, Film, Globe, GraduationCap, Play, Star, Trash2 } from 'lucide-react'
import { useId, useState } from 'react'
import type { Professional, ProfessionalMedia, ProfessionalReview, SocialLinks, SocialNetwork } from '../lib/database.types'
import { portfolioUrl } from '../lib/supabase'
import {
  ageFrom,
  COMMENT_MAX,
  embedUrl,
  hasExperience,
  PROVIDER_LABEL,
  ratingBreakdown,
  reviewsLabel,
  SOCIAL_NETWORKS,
  socialDisplay,
  timeAgo,
  videoThumbnail,
  watchUrl,
  yearsLabel,
  type VideoRef,
} from '../lib/vitrine'
import { Avatar } from './Avatar'
import { Modal } from './ui'

// ---------------------------------------------------------------------------
// Formação e experiência
// ---------------------------------------------------------------------------

type ExperienceFields = Pick<Professional, 'education' | 'years_experience' | 'birth_year' | 'experiences'>

export function ExperienceCard({ pro, emptyHint }: { pro: ExperienceFields; emptyHint?: string }) {
  const age = ageFrom(pro.birth_year)
  if (!hasExperience(pro)) {
    return emptyHint ? (
      <div className="card space-y-2">
        <h2 className="eyebrow">Formação e experiência</h2>
        <p className="text-sm text-muted">{emptyHint}</p>
      </div>
    ) : null
  }
  return (
    <div className="card space-y-3">
      <h2 className="eyebrow">Formação e experiência</h2>
      <ul className="space-y-2 text-sm">
        {pro.education && (
          <li className="flex items-start gap-2">
            <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              <span className="sr-only">Formação: </span>
              {pro.education}
            </span>
          </li>
        )}
        {pro.years_experience != null && (
          <li className="flex items-start gap-2">
            <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            {yearsLabel(pro.years_experience)}
          </li>
        )}
        {age != null && (
          <li className="flex items-start gap-2">
            <Cake className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            {age} anos
          </li>
        )}
      </ul>
      {pro.experiences?.length > 0 && (
        <div className="space-y-1.5 border-t border-line pt-3">
          <h3 className="text-xs font-semibold text-muted">Experiências</h3>
          <ul className="space-y-1.5 text-sm">
            {pro.experiences.map((e) => (
              <li key={e} className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Redes sociais
// ---------------------------------------------------------------------------

/** Ícones simples das redes (o lucide não traz marcas). */
export function SocialIcon({ network, className = 'h-5 w-5' }: { network: SocialNetwork; className?: string }) {
  const common = { className, viewBox: '0 0 24 24', 'aria-hidden': true as const }
  switch (network) {
    case 'instagram':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'facebook':
      return (
        <svg {...common} fill="currentColor">
          <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H8v3h2.5V21z" />
        </svg>
      )
    case 'tiktok':
      return (
        <svg {...common} fill="currentColor">
          <path d="M16.6 3h-3.1v12.2a2.7 2.7 0 1 1-2.7-2.7c.3 0 .5 0 .8.1V9.4a5.8 5.8 0 1 0 5 5.8V9.1a7.4 7.4 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-4.3-4.4z" />
        </svg>
      )
    case 'youtube':
      return (
        <svg {...common} fill="currentColor">
          <path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5.2 3z" />
        </svg>
      )
    case 'linkedin':
      return (
        <svg {...common} fill="currentColor">
          <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.75h4V21H3zM9.5 9.75h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21h-4z" />
        </svg>
      )
    default:
      return <Globe className={className} aria-hidden="true" />
  }
}

export function SocialButtons({ links, firstName }: { links: SocialLinks; firstName: string }) {
  const present = SOCIAL_NETWORKS.filter((n) => links[n.key])
  if (present.length === 0) return null
  return (
    <div className="card space-y-3">
      <h2 className="eyebrow">Redes sociais</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {present.map(({ key, label }) => (
          <a
            key={key}
            href={links[key]}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="btn-outline justify-start gap-3 px-4 py-2.5 text-left"
            aria-label={`${label} de ${firstName} (abre em outra aba)`}
          >
            <SocialIcon network={key} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm">{label}</span>
              <span className="block truncate text-xs font-normal text-muted">{socialDisplay(key, links[key]!)}</span>
            </span>
            <ExternalLink className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
          </a>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Galeria
// ---------------------------------------------------------------------------

function mediaRef(m: ProfessionalMedia): VideoRef | null {
  return m.kind === 'link' && m.provider && m.external_id ? { provider: m.provider, id: m.external_id } : null
}

function mediaLabel(m: ProfessionalMedia): string {
  const what = m.kind === 'foto' ? 'Foto' : 'Vídeo'
  return m.caption ? `${what}: ${m.caption}` : what
}

/** Miniatura quadrada de um item da galeria. */
function MediaTile({ item, onOpen }: { item: ProfessionalMedia; onOpen: () => void }) {
  const ref = mediaRef(item)
  const thumb = item.kind === 'foto' && item.storage_path ? portfolioUrl(item.storage_path) : ref ? videoThumbnail(ref) : null
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative aspect-square w-full overflow-hidden rounded-2xl bg-lavender-soft focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={`Abrir ${mediaLabel(item)}`}
    >
      {thumb ? (
        <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
      ) : item.kind === 'video' && item.storage_path ? (
        // #t=0.5: o navegador mostra um quadro do começo como miniatura
        <video src={`${portfolioUrl(item.storage_path)}#t=0.5`} preload="metadata" muted playsInline className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-start justify-start p-2 text-primary">
          <span className="inline-flex items-center gap-1 rounded-full bg-card/80 px-2 py-1 text-xs font-semibold">
            <Film className="h-3.5 w-3.5" aria-hidden="true" />
            {ref ? PROVIDER_LABEL[ref.provider] : 'Vídeo'}
          </span>
        </span>
      )}
      {item.kind !== 'foto' && (
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-navy/70 text-white">
            <Play className="h-5 w-5 fill-white" />
          </span>
        </span>
      )}
      {item.caption && (
        <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-navy/80 to-transparent px-2 pt-4 pb-1.5 text-left text-xs text-white">
          {item.caption}
        </span>
      )}
    </button>
  )
}

/** Foto ou vídeo em tamanho grande. Vídeos de fora só carregam o player ao abrir. */
function MediaViewer({ item }: { item: ProfessionalMedia }) {
  const ref = mediaRef(item)
  if (item.kind === 'foto' && item.storage_path) {
    return <img src={portfolioUrl(item.storage_path)} alt={item.caption || 'Foto do profissional'} className="max-h-[70vh] w-full rounded-xl object-contain" />
  }
  if (item.kind === 'video' && item.storage_path) {
    return <video src={portfolioUrl(item.storage_path)} controls autoPlay playsInline className="max-h-[70vh] w-full rounded-xl bg-black" />
  }
  if (ref) {
    return (
      <div className="space-y-2">
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
          <iframe
            src={embedUrl(ref)}
            title={item.caption || `Vídeo do ${PROVIDER_LABEL[ref.provider]}`}
            className="h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        <a href={watchUrl(ref)} target="_blank" rel="noopener noreferrer" className="tap gap-1 text-sm font-semibold text-primary">
          Abrir no {PROVIDER_LABEL[ref.provider]} <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    )
  }
  return null
}

export function MediaGrid({
  items,
  onDelete,
  deletingId,
}: {
  items: ProfessionalMedia[]
  /** Só no "Meu perfil": mostra o botão de apagar em cada item */
  onDelete?: (item: ProfessionalMedia) => void
  deletingId?: string | null
}) {
  const [open, setOpen] = useState<ProfessionalMedia | null>(null)
  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((m) => (
          <li key={m.id} className="relative">
            <MediaTile item={m} onOpen={() => setOpen(m)} />
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(m)}
                disabled={deletingId === m.id}
                className="absolute top-1.5 right-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-card/90 text-attention shadow transition hover:bg-card disabled:opacity-50"
                aria-label={`Apagar ${mediaLabel(m)}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>
      <Modal open={open !== null} onClose={() => setOpen(null)} title={open?.caption || (open?.kind === 'foto' ? 'Foto' : 'Vídeo')} wide>
        {open && <MediaViewer key={open.id} item={open} />}
        <button className="btn-outline w-full" onClick={() => setOpen(null)}>
          Fechar
        </button>
      </Modal>
    </>
  )
}

// ---------------------------------------------------------------------------
// Avaliações
// ---------------------------------------------------------------------------

export function Stars({ value, size = 'h-4 w-4' }: { value: number; size?: string }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${value} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${size} ${i <= Math.round(value) ? 'fill-gold text-gold' : 'text-line'}`} aria-hidden="true" />
      ))}
    </span>
  )
}

/** Escolha da nota com 5 estrelas (grupo de opções acessível). */
export function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const name = useId()
  const labels = ['Ruim', 'Regular', 'Bom', 'Muito bom', 'Excelente']
  return (
    <fieldset className="space-y-1">
      <legend className="text-sm font-semibold">Sua nota</legend>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <label key={i} className="cursor-pointer rounded-lg p-1 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary">
            <input type="radio" name={name} className="sr-only" checked={value === i} onChange={() => onChange(i)} />
            <Star className={`h-8 w-8 transition ${i <= value ? 'fill-gold text-gold' : 'text-muted/50'}`} aria-hidden="true" />
            <span className="sr-only">
              {i} {i === 1 ? 'estrela' : 'estrelas'} ({labels[i - 1]})
            </span>
          </label>
        ))}
      </div>
      <p className="h-4 text-xs text-muted" aria-live="polite">
        {value ? labels[value - 1] : ''}
      </p>
    </fieldset>
  )
}

/** Nota média, total e quantas avaliações de cada nota. */
export function RatingSummary({ rating, count, reviews }: { rating: number | null; count: number; reviews: ProfessionalReview[] }) {
  if (rating == null || count === 0) return null
  const breakdown = ratingBreakdown(reviews.map((r) => r.rating))
  return (
    <div className="flex items-center gap-5">
      <div className="text-center">
        <p className="font-display text-4xl font-extrabold">{rating.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}</p>
        <Stars value={rating} />
        <p className="mt-0.5 text-xs text-muted">{reviewsLabel(count)}</p>
      </div>
      <ul className="flex-1 space-y-1" aria-label="Avaliações por nota">
        {breakdown.map((b) => (
          <li key={b.stars} className="flex items-center gap-2 text-xs">
            <span className="w-3 text-right text-muted">{b.stars}</span>
            <Star className="h-3 w-3 fill-gold text-gold" aria-hidden="true" />
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-chip">
              <span className="block h-full rounded-full bg-gold" style={{ width: `${Math.round(b.share * 100)}%` }} />
            </span>
            <span className="w-4 text-muted">
              {b.count}
              <span className="sr-only"> com {b.stars} estrelas</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ReviewItem({ review, mine = false }: { review: ProfessionalReview; mine?: boolean }) {
  return (
    <li className="space-y-1.5 border-t border-line pt-3 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-2">
        <Avatar seed={review.author_avatar_seed} name={review.author_name} size={32} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {review.author_name}
            {mine && <span className="ml-1.5 rounded-full bg-lavender-soft px-2 py-0.5 text-xs text-primary">Você</span>}
          </p>
          <p className="flex items-center gap-2 text-xs text-muted">
            <Stars value={review.rating} size="h-3 w-3" />
            <span>{timeAgo(review.created_at)}</span>
          </p>
        </div>
      </div>
      {review.comment && <p className="text-sm leading-relaxed">{review.comment}</p>}
    </li>
  )
}

/** Formulário de avaliação (nota + comentário), dentro de um Modal. */
export function ReviewForm({
  initialRating = 0,
  initialComment = '',
  saving,
  error,
  onSubmit,
  onCancel,
  onDelete,
}: {
  initialRating?: number
  initialComment?: string
  saving: boolean
  error?: string | null
  onSubmit: (rating: number, comment: string) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const [rating, setRating] = useState(initialRating)
  const [comment, setComment] = useState(initialComment)
  const commentId = useId()
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (rating) onSubmit(rating, comment)
      }}
    >
      <StarPicker value={rating} onChange={setRating} />
      <div className="space-y-1.5">
        <label htmlFor={commentId} className="text-sm font-semibold">
          Comentário <span className="font-normal text-muted">(opcional)</span>
        </label>
        <textarea
          id={commentId}
          className="input min-h-24 resize-y"
          maxLength={COMMENT_MAX}
          placeholder="Conte como foi o acompanhamento."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <p className="flex justify-between text-xs text-muted">
          <span>Aparece com seu primeiro nome e a inicial do sobrenome.</span>
          <span className="shrink-0">
            {comment.length} / {COMMENT_MAX}
          </span>
        </p>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-attention-soft px-3 py-2 text-sm text-attention">
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn-outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={!rating || saving}>
          {saving ? 'Salvando…' : 'Publicar'}
        </button>
      </div>
      {onDelete && (
        <button type="button" className="tap w-full justify-center gap-1 text-sm font-semibold text-attention" onClick={onDelete} disabled={saving}>
          <Trash2 className="h-4 w-4" aria-hidden="true" /> Apagar minha avaliação
        </button>
      )}
    </form>
  )
}
