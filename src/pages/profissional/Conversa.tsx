import { useParams } from 'react-router-dom'
import { useAuth } from '../../auth/auth-context'
import { ChatThread } from '../../components/ChatThread'
import { useConversation, useMarkReadOnView, useSendMessage } from '../../hooks/useChat'
import { usePatient } from '../../hooks/useProData'

export function ConversaPro() {
  const { personId } = useParams()
  const { session } = useAuth()
  const me = session!.user.id
  const patient = usePatient(personId)
  const thread = useConversation(personId, me)
  const send = useSendMessage()
  useMarkReadOnView(thread.data, me)

  const share = patient.data?.share
  const name = share?.profiles.full_name ?? 'Paciente'
  const firstName = name.split(' ')[0]

  return (
    <ChatThread
      meId={me}
      peer={{
        name,
        subtitle: share ? 'Compartilha a rotina com você' : undefined,
        seed: share?.profiles.avatar_seed,
        photo: share?.profiles.avatar_path,
      }}
      back={{ to: '/pro/mensagens', label: 'Mensagens' }}
      messages={thread.data}
      loading={thread.isLoading || patient.isLoading}
      error={thread.error?.message}
      onRetry={() => thread.refetch()}
      onSend={(body) => send.mutateAsync({ personId: personId!, professionalId: me, body })}
      sending={send.isPending}
      sendError={send.error?.message}
      closedReason={
        patient.isLoading || share
          ? undefined
          : 'Esta pessoa não compartilha mais a rotina com você, então a conversa foi encerrada.'
      }
      placeholder={`Escreva para ${firstName}`}
    />
  )
}
