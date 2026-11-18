import { BadgeCheck, ChevronLeft, MessageSquare, Pencil, ShieldCheck, Star } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '../../components/Avatar'
import { DemoBanner } from '../../components/DemoBanner'
import { Rating } from '../../components/ProCard'
import { ExperienceCard, MediaGrid, RatingSummary, ReviewForm, ReviewItem, SocialButtons } from '../../components/Showcase'
import { ErrorState, Modal, Skeleton } from '../../components/ui'
import { useGeolocation } from '../../hooks/useGeolocation'
import { useMyTeam, useProfessional, useRevokeShare, useShareRoutine } from '../../hooks/usePersonData'
import { useCanReview, useDeleteReview, useProMedia, useProReviews, useSaveReview } from '../../hooks/useShowcase'
import { useAuth } from '../../auth/auth-context'
import { distanceKm, formatDistance } from '../../lib/geo'
import { availabilityLines } from '../../lib/profile'
import { MODALITY_LABEL, SHARED_DATA, specialtyLabel } from '../../lib/specialties'
import { acceptsReviews } from '../../lib/vitrine'

export function PerfilProfissional() {
  const { id } = useParams()
  const navigate = useNavigate()
  const pro = useProfessional(id)
  const team = useMyTeam()
  const geo = useGeolocation()
  const share = useShareRoutine()
  const revoke = useRevokeShare()
  const { session } = useAuth()
  const reviewable = Boolean(pro.data && acceptsReviews(pro.data.specialty))
  const media = useProMedia(id)
  const reviews = useProReviews(id, reviewable)
  const canReview = useCanReview(id, reviewable)
  const saveReview = useSaveReview()
  const deleteReview = useDeleteReview()
  const [reviewOpen, setReviewOpen] = useState(false)

  const [consentOpen, setConsentOpen] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [revokeOpen, setRevokeOpen] = useState(false)

  if (pro.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64" />
        <Skeleton className="h-40" />
      </div>
    )
  }
  if (pro.error) return <ErrorState message={pro.error.message} onRetry={() => pro.refetch()} />
  if (!pro.data) {
    return (
      <div className="card space-y-3 text-center">
        <p className="font-semibold">Profissional não encontrado.</p>
        <Link to="/saude/perto" className="btn-primary">Voltar para a busca</Link>
      </div>
    )
  }

  const p = pro.data
  const activeShare = team.data?.find((s) => s.professional_id === p.id)
  const km = p.lat != null && p.lng != null ? distanceKm(geo.position, { lat: p.lat, lng: p.lng }) : null
  const firstName = p.profiles.full_name.split(' ')[0]
  const hours = availabilityLines(p.availability)
  const myReview = reviews.data?.find((r) => r.person_id === session?.user.id)
  const closeReview = () => {
    setReviewOpen(false)
    saveReview.reset()
    deleteReview.reset()
  }

  return (
    <section className="space-y-4">
      {/* Cabeçalho azul-marinho, como no mockup */}
      <div className="-mx-4 -mt-6 bg-navy px-4 pt-6 pb-8 text-center text-white sm:mx-0 sm:mt-0 sm:rounded-card">
        <button onClick={() => navigate(-1)} className="tap gap-1 text-sm font-semibold text-lavender">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Voltar
        </button>
        <div className="mx-auto mt-2 w-fit rounded-full border-4 border-lavender">
          <Avatar seed={p.profiles.avatar_seed} photo={p.profiles.avatar_path} name={p.profiles.full_name} size={104} />
        </div>
        <h1 className="mt-3 text-2xl font-bold">{p.profiles.full_name}</h1>
        <p className="mt-1 inline-flex items-center gap-1 text-sm text-white/80">
          {specialtyLabel(p.specialty)}
          {p.verified ? (
            <>
              {' · '}
              <BadgeCheck className="h-4 w-4 text-lavender" aria-hidden="true" /> registro verificado
            </>
          ) : p.rejection_reason ? (
            // Só quem já tem vínculo enxerga um perfil recusado (a busca esconde).
            <>{' · '}registro não confirmado pela equipe</>
          ) : (
            p.registry && <>{' · '}registro em verificação</>
          )}
        </p>
        {p.rating != null && (
          <div className="mt-2 flex justify-center text-white [&_.text-muted]:text-white/70">
            <Rating rating={p.rating} count={p.reviews_count} />
          </div>
        )}
        <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs">
          {km != null && <span className="rounded-full bg-white/10 px-3 py-1">{formatDistance(km)} de você</span>}
          <span className="rounded-full bg-white/10 px-3 py-1">{MODALITY_LABEL[p.modality]}</span>
          {p.is_demo && <span className="rounded-full bg-white/10 px-3 py-1">Perfil demonstrativo</span>}
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="eyebrow">Sobre</h2>
        <p className="text-sm leading-relaxed">{p.bio}</p>
        {p.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {p.tags.map((t) => (
              <span key={t} className="chip">{t}</span>
            ))}
          </div>
        )}
        {p.neighborhood && <p className="text-xs text-muted">{p.neighborhood}, {p.city}</p>}
      </div>

      <ExperienceCard pro={p} />

      <SocialButtons links={p.social_links ?? {}} firstName={firstName} />

      {media.data && media.data.length > 0 && (
        <div className="card space-y-3">
          <h2 className="eyebrow">Fotos e vídeos</h2>
          <MediaGrid items={media.data} />
        </div>
      )}

      {hours.length > 0 && (
        <div className="card space-y-2">
          <h2 className="eyebrow">Horários de atendimento</h2>
          <ul className="space-y-1 text-sm">
            {hours.map((h) => (
              <li key={h.days} className="flex justify-between gap-3">
                <span className="font-semibold">{h.days}</span>
                <span className="text-muted">{h.hours}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Compartilhar rotina: o coração do MVP */}
      <div className="card space-y-3 border border-lavender">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="font-semibold">
            {activeShare ? `${firstName} acompanha sua rotina` : `Deixe ${firstName} acompanhar sua rotina`}
          </h2>
        </div>
        {activeShare ? (
          <>
            <p className="text-sm text-muted">
              Você compartilha desde {new Date(activeShare.created_at).toLocaleDateString('pt-BR')}. {firstName} vê seus
              registros e pode te mandar dicas entre as consultas.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Link to={`/mensagens/${p.id}`} className="btn-primary gap-2">
                <MessageSquare className="h-4 w-4" aria-hidden="true" /> Mandar mensagem
              </Link>
              <button className="btn-outline" onClick={() => setRevokeOpen(true)}>
                Parar de compartilhar
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">
              {firstName} passa a ver como está sua rotina entre uma consulta e outra e pode agir antes de você perder o ritmo.
              Você pode parar quando quiser.
            </p>
            <button className="btn-primary w-full" disabled={team.isLoading} onClick={() => setConsentOpen(true)}>
              Compartilhar minha rotina
            </button>
          </>
        )}
      </div>

      {reviewable && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="eyebrow">Avaliações</h2>
            {canReview.data && (
              <button className="btn-outline gap-1.5 px-3 py-2 text-sm" onClick={() => setReviewOpen(true)}>
                {myReview ? (
                  <>
                    <Pencil className="h-4 w-4" aria-hidden="true" /> Editar a minha
                  </>
                ) : (
                  <>
                    <Star className="h-4 w-4" aria-hidden="true" /> Avaliar
                  </>
                )}
              </button>
            )}
          </div>
          {reviews.isLoading ? (
            <Skeleton className="h-24" />
          ) : reviews.data && reviews.data.length > 0 ? (
            <>
              <RatingSummary rating={p.rating} count={p.reviews_count} reviews={reviews.data} />
              <ul className="space-y-3 border-t border-line pt-3">
                {reviews.data.map((r) => (
                  <ReviewItem key={r.id} review={r} mine={r.id === myReview?.id} />
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted">
              Ainda sem avaliações.
              {canReview.data ? ` Seja a primeira pessoa a avaliar ${firstName}.` : ''}
            </p>
          )}
          {canReview.data === false && (
            <p className="text-xs text-muted">Só avalia quem já compartilhou a rotina com {firstName}.</p>
          )}
        </div>
      )}

      <DemoBanner />

      <Modal
        open={reviewOpen}
        onClose={closeReview}
        title={myReview ? 'Editar sua avaliação' : `Avaliar ${firstName}`}
      >
        {reviewOpen && (
          <ReviewForm
            initialRating={myReview?.rating}
            initialComment={myReview?.comment}
            saving={saveReview.isPending || deleteReview.isPending}
            error={saveReview.error?.message ?? deleteReview.error?.message}
            onCancel={closeReview}
            onSubmit={async (rating, comment) => {
              try {
                await saveReview.mutateAsync({ proId: p.id, rating, comment, existingId: myReview?.id })
                closeReview()
              } catch {
                /* a mensagem aparece no formulário */
              }
            }}
            onDelete={
              myReview
                ? async () => {
                    try {
                      await deleteReview.mutateAsync({ id: myReview.id, proId: p.id })
                      closeReview()
                    } catch {
                      /* a mensagem aparece no formulário */
                    }
                  }
                : undefined
            }
          />
        )}
      </Modal>

      {/* Consentimento explícito (especificação, seção 10) */}
      <Modal open={consentOpen} onClose={() => { setConsentOpen(false); setAgreed(false); share.reset() }} title={`Compartilhar com ${firstName}?`}>
        <p className="text-sm">{p.profiles.full_name} vai poder ver:</p>
        <ul className="space-y-1.5 text-sm">
          {SHARED_DATA.map((d) => (
            <li key={d} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" /> {d}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">
          Inclui os registros que você já fez. Para montar o resumo semanal do profissional, seus registros (só com o seu
          primeiro nome) podem ser processados por um serviço de IA. Ninguém mais vê seus dados, e você pode revogar o acesso
          a qualquer momento neste mesmo perfil.
        </p>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          Entendi e quero compartilhar minha rotina com {firstName}.
        </label>
        {share.isError && <p className="text-sm text-attention">Não deu para compartilhar: {share.error.message}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-outline" onClick={() => { setConsentOpen(false); setAgreed(false) }}>Agora não</button>
          <button
            className="btn-primary"
            disabled={!agreed || share.isPending}
            onClick={async () => {
              await share.mutateAsync(p.id)
              setConsentOpen(false)
              setAgreed(false)
            }}
          >
            {share.isPending ? 'Salvando…' : 'Compartilhar'}
          </button>
        </div>
      </Modal>

      <Modal open={revokeOpen} onClose={() => setRevokeOpen(false)} title="Parar de compartilhar?">
        <p className="text-sm">
          {firstName} deixa de ver sua rotina na hora, inclusive os registros antigos. Você pode compartilhar de novo depois.
        </p>
        {revoke.isError && <p className="text-sm text-attention">Não deu para revogar: {revoke.error.message}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-outline" onClick={() => setRevokeOpen(false)}>Cancelar</button>
          <button
            className="btn-primary bg-attention hover:bg-attention/90"
            disabled={revoke.isPending}
            onClick={async () => {
              if (activeShare) await revoke.mutateAsync(activeShare.id)
              setRevokeOpen(false)
            }}
          >
            {revoke.isPending ? 'Salvando…' : 'Parar'}
          </button>
        </div>
      </Modal>
    </section>
  )
}
