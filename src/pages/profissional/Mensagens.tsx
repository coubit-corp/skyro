import { MessageSquare } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/auth-context'
import { ChatThread } from '../../components/Chat'
import { ConversationList } from '../../components/ConversationList'
import { DemoBanner } from '../../components/DemoBanner'
import { ErrorState, PageHeader, Skeleton } from '../../components/ui'
import { useProConversations } from '../../hooks/useMessages'
import { unreadLabel } from '../../lib/messages'

/**
 * Mensagens do profissional com os pacientes que compartilham a rotina.
 * No computador: lista e conversa lado a lado. No celular: uma de cada vez.
 */
export function Mensagens() {
  const { personId } = useParams()
  const { session } = useAuth()
  const me = session?.user.id ?? ''
  const list = useProConversations()
  const items = list.data ?? []
  const open = items.find((c) => c.otherId === personId)
  const unread = items.reduce((n, c) => n + c.unread, 0)

  return (
    <section className="space-y-4">
      <div className={personId ? 'hidden lg:block' : ''}>
        <PageHeader
          title="Mensagens"
          subtitle={
            unread > 0
              ? `${unreadLabel(unread)}. Converse com quem compartilha a rotina com você.`
              : 'Converse com quem compartilha a rotina com você.'
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(260px,340px)_1fr]">
        <div className={`overflow-hidden rounded-card bg-card ${personId ? 'hidden lg:block' : ''}`}>
          {list.isLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : list.error ? (
            <div className="p-4">
              <ErrorState message={list.error.message} onRetry={() => list.refetch()} />
            </div>
          ) : items.length === 0 ? (
            <p className="p-5 text-sm text-muted">
              Nenhum paciente ainda. Quando alguém compartilhar a rotina com você, a conversa aparece aqui.
            </p>
          ) : (
            <ConversationList items={items} meId={me} hrefFor={(id) => `/pro/mensagens/${id}`} activeId={personId} />
          )}
        </div>

        {personId ? (
          list.isLoading ? (
            <Skeleton className="h-96" />
          ) : open ? (
            <ChatThread
              key={personId}
              personId={personId}
              professionalId={me}
              other={open.other}
              subtitle="Compartilha a rotina com você"
              back={{ to: '/pro/mensagens', label: 'Voltar para as conversas', mobileOnly: true }}
              headerAction={
                <Link to={`/pro/pacientes/${personId}`} className="btn-outline shrink-0 px-3 py-2 text-sm">
                  Ver ficha
                </Link>
              }
              emptyHint={`Mande a primeira mensagem para ${open.other.full_name.split(' ')[0]}. Só vocês dois veem a conversa.`}
            />
          ) : (
            <div className="card space-y-3 text-sm">
              <p className="font-semibold">Conversa indisponível.</p>
              <p className="text-muted">
                Essa pessoa não compartilha mais a rotina com você. Quando o compartilhamento termina, a conversa sai daqui.
              </p>
              <Link to="/pro/mensagens" className="btn-outline">
                Voltar para as conversas
              </Link>
            </div>
          )
        ) : (
          <div className="hidden min-h-96 flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line text-center text-sm text-muted lg:flex">
            <MessageSquare className="h-8 w-8 text-lavender" aria-hidden="true" />
            Escolha uma conversa na lista.
          </div>
        )}
      </div>

      <div className={personId ? 'hidden lg:block' : ''}>
        <p className="text-xs text-muted">
          As mensagens não substituem a consulta. Em caso de urgência, oriente a pessoa a procurar atendimento presencial.
        </p>
        <DemoBanner />
      </div>
    </section>
  )
}
