import { MessageSquare } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar } from '../../components/Avatar'
import { DemoBanner } from '../../components/DemoBanner'
import { ErrorState, PageHeader, SectionTitle, Skeleton } from '../../components/ui'
import { usePersonConversations } from '../../hooks/useMessages'
import { useMyTeam } from '../../hooks/usePersonData'
import { unreadLabel } from '../../lib/messages'
import { SHARED_DATA, SPECIALTIES, specialtyLabel } from '../../lib/specialties'

export function Saude() {
  const team = useMyTeam()
  const conversations = usePersonConversations()
  const unreadFrom = (proId: string) => conversations.data?.find((c) => c.otherId === proId)?.unread ?? 0
  const unread = conversations.data?.reduce((n, c) => n + c.unread, 0) ?? 0

  return (
    <section>
      <PageHeader title="Sua saúde" subtitle="Profissionais que acompanham a sua rotina real." />

      <SectionTitle
        action={
          <Link to="/saude/perto" className="tap text-sm font-semibold text-primary">
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

      <SectionTitle
        action={
          <Link to="/saude/mensagens" className="tap gap-1.5 text-sm font-semibold text-primary">
            <MessageSquare className="h-4 w-4" aria-hidden="true" /> Mensagens
            {unread > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-white">
                {unread}
                <span className="sr-only"> ({unreadLabel(unread)})</span>
              </span>
            )}
          </Link>
        }
      >
        Sua equipe
      </SectionTitle>
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
                <Avatar seed={pro.profiles.avatar_seed} photo={pro.profiles.avatar_path} name={pro.profiles.full_name} size={48} />
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
              <Link to={`/saude/mensagens/${pro.id}`} className="btn-outline w-full gap-2 py-2.5">
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                Mensagem
                {unreadFrom(pro.id) > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-white">
                    {unreadFrom(pro.id)}
                    <span className="sr-only"> ({unreadLabel(unreadFrom(pro.id))})</span>
                  </span>
                )}
              </Link>
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
