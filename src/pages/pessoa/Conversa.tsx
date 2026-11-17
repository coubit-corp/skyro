import { useParams } from 'react-router-dom'
import { useAuth } from '../../auth/auth-context'
import { ChatThread } from '../../components/ChatThread'
import { useConversation, useMarkReadOnView, useSendMessage } from '../../hooks/useChat'
import { useMyTeam, useProfessional } from '../../hooks/usePersonData'
import { specialtyLabel } from '../../lib/specialties'

export function Conversa() {
  const { professionalId } = useParams()
  const { session } = useAuth()
  const me = session!.user.id
  const pro = useProfessional(professionalId)
  const team = useMyTeam()
  const thread = useConversation(me, professionalId)
  const send = useSendMessage()
  useMarkReadOnView(thread.data, me)

  const name = pro.data?.profiles.full_name ?? 'Profissional'
  const firstName = name.split(' ')[0]
  const active = team.data?.some((s) => s.professional_id === professionalId)

  return (
    <ChatThread
      meId={me}
      peer={{
        name,
        subtitle: pro.data ? `${specialtyLabel(pro.data.specialty)} · acompanha sua rotina` : undefined,
        seed: pro.data?.profiles.avatar_seed,
        photo: pro.data?.profiles.avatar_path,
      }}
      back={{ to: '/mensagens', label: 'Mensagens' }}
      messages={thread.data}
      loading={thread.isLoading || pro.isLoading || team.isLoading}
      error={thread.error?.message}
      onRetry={() => thread.refetch()}
      onSend={(body) => send.mutateAsync({ personId: me, professionalId: professionalId!, body })}
      sending={send.isPending}
      sendError={send.error?.message}
      closedReason={
        team.isLoading || active
          ? undefined
          : `Você não compartilha mais sua rotina com ${firstName}. Para voltar a conversar, compartilhe de novo no perfil.`
      }
      placeholder={`Escreva para ${firstName}`}
    />
  )
}
