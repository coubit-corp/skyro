import { Link } from 'react-router-dom'
import { Avatar } from '../../components/Avatar'
import { DemoBanner } from '../../components/DemoBanner'
import { ErrorState, PageHeader, SectionTitle, Skeleton } from '../../components/ui'
import { useMyTeam } from '../../hooks/usePersonData'
import { SHARED_DATA, SPECIALTIES, specialtyLabel } from '../../lib/specialties'

export function Saude() {
  const team = useMyTeam()

  return (
    <section>
      <PageHeader title="Sua saúde" subtitle="Profissionais que acompanham a sua rotina real." />

      <SectionTitle
        action={
          <Link to="/saude/perto" className="text-sm font-semibold text-primary">
            Ver mapa
          </Link>
        }
      >
        Encontrar perto de você
      </SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        {SPECIALTIES.map((s) => (
          <Link
            key={s.value}
            to={`/saude/perto?especialidade=${s.value}`}
            className="flex items-center gap-3 rounded-card border border-line bg-card p-4 font-semibold transition hover:border-lavender"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lavender-soft font-bold text-primary">
              {s.letter}
            </span>
            <span className="text-sm">{s.label}</span>
          </Link>
        ))}
      </div>

      <SectionTitle>Sua equipe</SectionTitle>
      {team.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : team.error ? (
        <ErrorState message={team.error.message} onRetry={() => team.refetch()} />
      ) : team.data!.length === 0 ? (
        <div className="card text-sm text-muted">
          Ninguém acompanha sua rotina ainda. Encontre um profissional acima e toque em{' '}
          <strong className="text-ink">Compartilhar minha rotina</strong> no perfil dele.
        </div>
      ) : (
        <ul className="space-y-3">
          {team.data!.map(({ id, professionals: pro }) => (
            <li key={id} className="card space-y-3">
              <div className="flex items-center gap-3">
                <Avatar seed={pro.profiles.avatar_seed} name={pro.profiles.full_name} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {pro.profiles.full_name.split(' ')[0]} · {specialtyLabel(pro.specialty)}
                  </p>
                  <p className="text-xs text-muted">Acompanha sua rotina</p>
                </div>
                <Link to={`/saude/profissional/${pro.id}`} className="btn-outline px-4 py-2">
                  Ver perfil
                </Link>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SHARED_DATA.map((d) => (
                  <span key={d} className="chip">
                    Vê: {d.toLowerCase()}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      <DemoBanner />
    </section>
  )
}
