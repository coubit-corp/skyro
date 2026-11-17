import { useMemo } from 'react'
import { useAuth } from '../../auth/auth-context'
import { ConversationList, type ConversationContact } from '../../components/ConversationList'
import { DemoBanner } from '../../components/DemoBanner'
import { ErrorState, PageHeader, Skeleton } from '../../components/ui'
import { useMyMessages } from '../../hooks/useChat'
import { usePatients } from '../../hooks/useProData'
import { summarizeConversations } from '../../lib/chat'

/** Caixa de mensagens do profissional: uma conversa por paciente que compartilha. */
export function MensagensPro() {
  const { session } = useAuth()
  const me = session!.user.id
  const patients = usePatients()
  const messages = useMyMessages('professional')

  const { items, contacts } = useMemo(() => {
    const contacts = new Map<string, ConversationContact>()
    for (const p of patients.data ?? []) {
      contacts.set(p.id, {
        id: p.id,
        name: p.name,
        subtitle: p.evaluation.status === 'atencao' ? 'Precisa de atenção hoje' : 'Em dia',
        seed: p.avatarSeed,
        photo: p.avatarPath,
      })
    }
    const ids = [...contacts.keys()]
    // Só pacientes que compartilham agora: quem revogou já some pelo banco.
    const items = summarizeConversations(messages.data ?? [], me, 'professional', ids).filter((c) =>
      contacts.has(c.otherId),
    )
    return { items, contacts }
  }, [patients.data, messages.data, me])

  const loading = patients.isLoading || messages.isLoading
  const error = patients.error ?? messages.error

  return (
    <section className="space-y-4">
      <PageHeader title="Mensagens" subtitle="Conversas com os pacientes que compartilham a rotina com você." />
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : error ? (
        <ErrorState
          message={error.message}
          onRetry={() => {
            patients.refetch()
            messages.refetch()
          }}
        />
      ) : items.length === 0 ? (
        <p className="card text-sm text-muted">
          Nenhum paciente compartilha a rotina com você ainda. Quando alguém compartilhar, a conversa aparece aqui.
        </p>
      ) : (
        <ConversationList items={items} contacts={contacts} meId={me} hrefFor={(id) => `/pro/mensagens/${id}`} />
      )}
      <DemoBanner />
    </section>
  )
}
