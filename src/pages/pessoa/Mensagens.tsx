import { MessageSquare } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/auth-context'
import { ChatThread } from '../../components/Chat'
import { ConversationList } from '../../components/ConversationList'
import { DemoBanner } from '../../components/DemoBanner'
import { ErrorState, PageHeader, Skeleton } from '../../components/ui'
import { usePersonConversations } from '../../hooks/useMessages'
import { specialtyLabel } from '../../lib/specialties'

/** Mensagens da pessoa com os profissionais que acompanham a rotina dela. */
export function Mensagens() {
  const { proId } = useParams()
  const { session } = useAuth()
  const me = session?.user.id ?? ''
  const list = usePersonConversations()
  const items = list.data ?? []
  const open = items.find((c) => c.otherId === proId)

  if (proId) {
    if (list.isLoading) return <Skeleton className="h-96" />
    if (!open) {
      return (
        <div className="card space-y-3 text-sm">
          <p className="font-semibold">Conversa indisponível.</p>
          <p className="text-muted">
            Você só conversa com quem acompanha sua rotina agora. Para conversar, compartilhe sua rotina no perfil do
            profissional.
          </p>
          <Link to="/saude/mensagens" className="btn-outline">
            Voltar para as mensagens
          </Link>
        </div>
      )
    }
    return (
      <ChatThread
        key={proId}
        personId={me}
        professionalId={proId}
        other={open.other}
        subtitle={specialtyLabel(open.other.specialty)}
        back={{ to: '/saude/mensagens', label: 'Voltar para as mensagens' }}
        headerAction={
          <Link to={`/saude/profissional/${proId}`} className="btn-outline shrink-0 px-3 py-2 text-sm">
            Perfil
          </Link>
        }
        emptyHint={`Tire uma dúvida com ${open.other.full_name.split(' ')[0]}. Só vocês dois veem a conversa.`}
      />
    )
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Mensagens"
        subtitle="Converse com os profissionais que acompanham sua rotina."
        back={{ to: '/saude', label: 'Saúde' }}
      />
      <div className="overflow-hidden rounded-card bg-card">
        {list.isLoading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : list.error ? (
          <div className="p-4">
            <ErrorState message={list.error.message} onRetry={() => list.refetch()} />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted">
            <MessageSquare className="h-8 w-8 text-lavender" aria-hidden="true" />
            <p>Você conversa aqui com os profissionais com quem compartilha sua rotina.</p>
            <Link to="/saude/perto" className="btn-outline mt-2">
              Encontrar profissionais
            </Link>
          </div>
        ) : (
          <ConversationList
            items={items}
            meId={me}
            hrefFor={(id) => `/saude/mensagens/${id}`}
            detail={(o) => specialtyLabel(o.specialty)}
          />
        )}
      </div>
      <p className="text-xs text-muted">
        As mensagens não substituem a consulta. Em caso de urgência, procure atendimento presencial ou ligue 192 (SAMU).
      </p>
      <DemoBanner />
    </section>
  )
}
