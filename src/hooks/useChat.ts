// Chat entre a pessoa e os profissionais da equipe dela.
// Quem pode ler e escrever é decidido pelo banco (RLS da tabela messages);
// aqui só buscamos, enviamos e mantemos a tela atualizada.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuth } from '../auth/auth-context'
import type { ChatMessage } from '../lib/chat'
import { supabase } from '../lib/supabase'

/** Reserva para quando o tempo real não estiver ligado no projeto do Supabase. */
const POLL_MS = 15_000

/** Numera os canais do tempo real para que cada uso tenha um nome único. */
let channelSeq = 0

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

function useMe(): string {
  const { session } = useAuth()
  if (!session) throw new Error('Usuário não autenticado')
  return session.user.id
}

/**
 * Atualiza as consultas do chat assim que chega uma mensagem nova (Supabase
 * Realtime). O filtro do canal é só um atalho: o banco já entrega apenas o
 * que a pessoa tem permissão de ler.
 *
 * Cada uso abre o próprio canal, com nome único: a mesma tela pode contar as
 * não lidas em dois lugares (topo e barra lateral), e o Supabase devolve o
 * canal já existente quando o nome se repete e recusa novas inscrições nele.
 */
function useChatRealtime(column: 'person_id' | 'professional_id', id: string) {
  const qc = useQueryClient()
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${column}-${id}-${++channelSeq}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `${column}=eq.${id}` }, () =>
        qc.invalidateQueries({ queryKey: ['chat'] }),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [column, id, qc])
}

/** Todas as minhas mensagens (para a caixa de entrada e o contador de não lidas). */
export function useMyMessages(side: 'person' | 'professional') {
  const me = useMe()
  const column = side === 'person' ? 'person_id' : 'professional_id'
  useChatRealtime(column, me)
  return useQuery({
    queryKey: ['chat', 'all', side, me],
    refetchInterval: POLL_MS,
    queryFn: async () =>
      unwrap<ChatMessage[]>(
        await supabase.from('messages').select('*').eq(column, me).order('created_at', { ascending: false }).limit(500),
      ),
  })
}

/** Quantas mensagens recebidas ainda não foram lidas. */
export function useUnreadCount(side: 'person' | 'professional') {
  const me = useMe()
  const all = useMyMessages(side)
  return (all.data ?? []).filter((m) => m.sender_id !== me && m.read_at == null).length
}

/** Uma conversa, da mais antiga para a mais nova. */
export function useConversation(personId: string | undefined, professionalId: string | undefined) {
  return useQuery({
    queryKey: ['chat', 'thread', personId, professionalId],
    enabled: Boolean(personId && professionalId),
    refetchInterval: POLL_MS,
    queryFn: async () =>
      unwrap<ChatMessage[]>(
        await supabase
          .from('messages')
          .select('*')
          .eq('person_id', personId!)
          .eq('professional_id', professionalId!)
          .order('created_at', { ascending: true })
          .limit(500),
      ),
  })
}

export function useSendMessage() {
  const me = useMe()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      personId,
      professionalId,
      body,
    }: {
      personId: string
      professionalId: string
      body: string
    }) =>
      unwrap(
        await supabase
          .from('messages')
          .insert({ person_id: personId, professional_id: professionalId, sender_id: me, body }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat'] }),
  })
}

/** Marca como lidas as mensagens recebidas (o banco só deixa mudar read_at). */
export function useMarkMessagesRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return
      unwrap(await supabase.from('messages').update({ read_at: new Date().toISOString() }).in('id', ids))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat'] }),
  })
}

/** Ao abrir a conversa, marca como lidas as mensagens recebidas (uma vez por mensagem). */
export function useMarkReadOnView(messages: ChatMessage[] | undefined, meId: string) {
  const mark = useMarkMessagesRead()
  const { mutate } = mark
  const pending = (messages ?? []).filter((m) => m.sender_id !== meId && m.read_at == null).map((m) => m.id)
  const key = pending.join(',')
  useEffect(() => {
    if (key) mutate(key.split(','))
  }, [key, mutate])
}
