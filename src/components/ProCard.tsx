import { Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ProfessionalWithProfile } from '../hooks/usePersonData'
import { formatDistance } from '../lib/geo'
import { MODALITY_LABEL, specialtyLabel } from '../lib/specialties'
import { Avatar } from './Avatar'

export function Rating({ rating, count }: { rating: number | null; count: number }) {
  if (rating == null) return null
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Star className="h-4 w-4 fill-gold text-gold" aria-hidden="true" />
      <strong>{rating.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}</strong>
      <span className="text-muted">({count})</span>
    </span>
  )
}

export function ProCard({ pro, distanceKm }: { pro: ProfessionalWithProfile; distanceKm?: number }) {
  return (
    <Link
      to={`/saude/profissional/${pro.id}`}
      className="card flex items-start gap-3 transition hover:ring-2 hover:ring-lavender"
    >
      <Avatar seed={pro.profiles.avatar_seed} name={pro.profiles.full_name} size={52} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold">{pro.profiles.full_name}</p>
          <span className="shrink-0 text-sm font-semibold text-primary">Ver perfil</span>
        </div>
        <p className="text-sm text-muted">
          {specialtyLabel(pro.specialty)}
          {distanceKm != null && ` · ${formatDistance(distanceKm)}`}
          {pro.neighborhood && ` · ${pro.neighborhood}`}
        </p>
        <Rating rating={pro.rating} count={pro.reviews_count} />
        <p className="text-xs text-muted">{MODALITY_LABEL[pro.modality]}</p>
      </div>
    </Link>
  )
}
