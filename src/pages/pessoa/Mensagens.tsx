import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/auth-context'
import { ConversationList, type ConversationContact } from '../../components/ConversationList'
import { DemoBanner } from '../../components/DemoBanner'
import { ErrorState, PageHeader, Skeleton } from '../../components/ui'
import { useMyMessages } from '../../hooks/useChat'
import { useMyTeam, useProfessionals } from '../../hooks/usePersonData'
import { summarizeConversations } from '../../lib/chat'
import { specialtyLabel } from '../../lib/specialties'

/** Caixa de mensagens da pessoa: uma conversa por profissional da equipe. */
export function Mensagens() {
  const { session } = useAuth()
  const me = session!.user.id
  const team = useMyTeam()
  const pros = useProfessionals()
  const messages = useMyMessages('person')

  const { items, contacts } = useMemo(() => {
    const contacts = new Map<string, ConversationContact>()
    // Inclui quem já saiu da equipe mas tem histórico, para a pessoa ainda poder ler.
    for (const p of pros.data ?? []) {
      contacts.set(p.id, {
        id: p.id,
        name: p.profiles.full_name,
        subtitle: specialtyLabel(p.specialty),
        seed: p.profiles.avatar_seed,
        photo: p.profiles.avatar_path,
      })
    }
    const teamIds = (team.data ?? []).map((s) => s.professional_id)
    return { items: summarizeConversations(messages.data ?? [], me, 'person', teamIds), contacts }
  }, [pros.data, team.data, messages.data, me])

  const loading = team.isLoading || messages.isLoading || pros.isLoading
  const error = team.error ?? messages.error ?? pros.error

  return (
    <section className="space-y-4">
      <PageHeader
        title="Mensagens"
        subtitle="Converse com os profissionais que acompanham sua rotina."
        back={{ to: '/saude', label: 'Saúde' }}
      />
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : error ? (
        <ErrorState
          message={error.message}
          onRetry={() => {
            team.refetch()
            messages.refetch()
          }}
        />
      ) : items.length === 0 ? (
        <div className="card space-y-2 text-sm text-muted">
          <p>Você ainda não tem ninguém na sua equipe.</p>
          <p>
            Encontre um profissional em{' '}
            <Link to="/saude/perto" className="font-semibold text-primary">
              Perto de você
            </Link>{' '}
            e compartilhe sua rotina para poder conversar.
          </p>
        </div>
      ) : (
        <ConversationList items={items} contacts={contacts} meId={me} hrefFor={(id) => `/mensagens/${id}`} />
      )}
      <DemoBanner />
    </section>
  )
}
