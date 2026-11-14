import { BadgeCheck, ChevronLeft, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '../../components/Avatar'
import { DemoBanner } from '../../components/DemoBanner'
import { Rating } from '../../components/ProCard'
import { ErrorState, Modal, Skeleton } from '../../components/ui'
import { useGeolocation } from '../../hooks/useGeolocation'
import { useMyTeam, useProfessional, useRevokeShare, useShareRoutine } from '../../hooks/usePersonData'
import { distanceKm, formatDistance } from '../../lib/geo'
import { MODALITY_LABEL, SHARED_DATA, specialtyLabel } from '../../lib/specialties'

export function PerfilProfissional() {
  const { id } = useParams()
  const navigate = useNavigate()
  const pro = useProfessional(id)
  const team = useMyTeam()
  const geo = useGeolocation()
  const share = useShareRoutine()
  const revoke = useRevokeShare()

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

  return (
    <section className="space-y-4">
      {/* Cabeçalho azul-marinho, como no mockup */}
      <div className="-mx-4 -mt-6 bg-navy px-4 pt-6 pb-8 text-center text-white sm:mx-0 sm:mt-0 sm:rounded-card">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm font-semibold text-lavender">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Voltar
        </button>
        <div className="mx-auto mt-2 w-fit rounded-full border-4 border-lavender">
          <Avatar seed={p.profiles.avatar_seed} name={p.profiles.full_name} size={104} />
        </div>
        <h1 className="mt-3 text-2xl font-bold">{p.profiles.full_name}</h1>
        <p className="mt-1 inline-flex items-center gap-1 text-sm text-white/80">
          {specialtyLabel(p.specialty)}
          {p.verified && (
            <>
              {' · '}
              <BadgeCheck className="h-4 w-4 text-lavender" aria-hidden="true" /> registro verificado
            </>
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
            <button className="btn-outline w-full" onClick={() => setRevokeOpen(true)}>
              Parar de compartilhar
            </button>
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

      <DemoBanner />

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
          Inclui os registros que você já fez. Seus dados não são mostrados para mais ninguém, e você pode revogar o acesso a
          qualquer momento neste mesmo perfil.
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
