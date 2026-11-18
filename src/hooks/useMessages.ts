// Mensagens entre a pessoa e os profissionais. Quem pode ler e enviar é o banco
// que decide (RLS); aqui só buscamos, enviamos e marcamos como lida.
// Sem tempo real: a conversa aberta é buscada de novo a cada poucos segundos.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/auth-context'
import type { Message, ProfileBrief, Specialty } from '../lib/database.types'
import { summarizeConversations } from '../lib/messages'
import { PRO_PROFILE, supabase } from '../lib/supabase'

/** Conversa aberta: busca de novo a cada 8 s. Lista: a cada 20 s. */
const THREAD_REFRESH = 8_000
const LIST_REFRESH = 20_000

function unwrap<T>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(friendly(res.error.message))
  return res.data as T
}

function friendly(message: string): string {
  if (/row-level security/i.test(message) && /messages/i.test(message)) {
    return 'Não deu para enviar. A conversa só funciona enquanto a pessoa compartilha a rotina, e contas de demonstração só conversam com contas de demonstração.'
  }
  return message
}

function useMe() {
  const { session } = useAuth()
  return session?.user.id
}

export type PatientContact = ProfileBrief
export type ProContact = ProfileBrief & { specialty: Specialty }

/** Lista de conversas do profissional: todos os pacientes com compartilhamento ativo. */
export function useProConversations() {
  const me = useMe()
  return useQuery({
    queryKey: ['conversations', 'pro', me],
    enabled: Boolean(me),
    refetchInterval: LIST_REFRESH,
    queryFn: async () => {
      const [shares, messages] = await Promise.all([
        supabase
          .from('shares')
          .select('person_id, created_at, profiles(full_name, avatar_seed, avatar_path)')
          .eq('professional_id', me!)
          .is('revoked_at', null),
        supabase
          .from('messages')
          .select('*')
          .eq('professional_id', me!)
          .order('created_at', { ascending: false })
          .limit(1000),
      ])
      const contacts = unwrap<{ person_id: string; created_at: string; profiles: ProfileBrief }[]>(shares).map((s) => ({
        otherId: s.person_id,
        other: s.profiles as PatientContact,
        since: s.created_at,
      }))
      return summarizeConversations(contacts, unwrap<Message[]>(messages), me!, 'professional')
    },
  })
}

/** Conversas da pessoa: os profissionais que acompanham a rotina dela agora. */
export function usePersonConversations() {
  const me = useMe()
  return useQuery({
    queryKey: ['conversations', 'person', me],
    enabled: Boolean(me),
    refetchInterval: LIST_REFRESH,
    queryFn: async () => {
      const [shares, messages] = await Promise.all([
        supabase
          .from('shares')
          .select(`professional_id, created_at, professionals(specialty, ${PRO_PROFILE})`)
          .eq('person_id', me!)
          .is('revoked_at', null),
        supabase.from('messages').select('*').eq('person_id', me!).order('created_at', { ascending: false }).limit(1000),
      ])
      type Row = { professional_id: string; created_at: string; professionals: { specialty: Specialty; profiles: ProfileBrief } }
      const contacts = unwrap<Row[]>(shares).map((s) => ({
        otherId: s.professional_id,
        other: { ...s.professionals.profiles, specialty: s.professionals.specialty } as ProContact,
        since: s.created_at,
      }))
      return summarizeConversations(contacts, unwrap<Message[]>(messages), me!, 'person')
    },
  })
}

/** Mensagens de uma conversa (as 200 mais recentes, em ordem). */
export function useThread(personId: string | undefined, professionalId: string | undefined) {
  return useQuery({
    queryKey: ['messages', personId, professionalId],
    enabled: Boolean(personId && professionalId),
    refetchInterval: THREAD_REFRESH,
    queryFn: async () =>
      unwrap<Message[]>(
        await supabase
          .from('messages')
          .select('*')
          .eq('person_id', personId!)
          .eq('professional_id', professionalId!)
          .order('created_at', { ascending: false })
          .limit(200),
      ).reverse(),
  })
}

export function useSendMessage() {
  const me = useMe()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ personId, professionalId, body }: { personId: string; professionalId: string; body: string }) =>
      unwrap(
        await supabase
          .from('messages')
          .insert({ person_id: personId, professional_id: professionalId, sender_id: me!, body })
          .select('*')
          .single(),
      ) as Message,
    onSuccess: (msg) => {
      // Aparece na hora, sem esperar a próxima busca
      qc.setQueryData<Message[]>(['messages', msg.person_id, msg.professional_id], (old) =>
        old && !old.some((m) => m.id === msg.id) ? [...old, msg] : old,
      )
      qc.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

/** Marca como lidas as mensagens recebidas nesta conversa. */
export function useMarkRead() {
  const me = useMe()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ personId, professionalId }: { personId: string; professionalId: string }) =>
      unwrap(
        await supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .eq('person_id', personId)
          .eq('professional_id', professionalId)
          .neq('sender_id', me!)
          .is('read_at', null),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  })
}
