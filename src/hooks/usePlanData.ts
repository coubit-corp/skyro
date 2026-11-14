// Consultas do "Meu plano" (pessoa) e do plano na ficha do paciente
// (profissional). Quem garante quem lê e escreve o quê é o banco (RLS).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/auth-context'
import type { PlanCheck, PlanItem, PlanNote, Share, Specialty } from '../lib/database.types'
import { addDays, today } from '../lib/dates'
import type { toPlanItemRow } from '../lib/plan'
import { supabase } from '../lib/supabase'

type PlanItemRow = ReturnType<typeof toPlanItemRow>

export type PlanAuthor = { specialty: Specialty; profiles: { full_name: string; avatar_seed: string | null } }
export type PersonPlanItem = PlanItem & { professionals: PlanAuthor }
type ShareWithAuthor = Share & { professionals: PlanAuthor }

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

function useUserId(): string {
  const { session } = useAuth()
  if (!session) throw new Error('Usuário não autenticado')
  return session.user.id
}

// ------------------------------------------------------------------ pessoa

export interface MyPlan {
  items: PersonPlanItem[]
  notes: PlanNote[]
  /** Itens marcados hoje */
  doneToday: Set<string>
  /** Todos os compartilhamentos (ativos e encerrados), um por profissional, o mais recente */
  shares: Map<string, ShareWithAuthor>
  painToday: number | null
}

export function useMyPlan() {
  const userId = useUserId()
  const todayIso = today()
  return useQuery({
    queryKey: ['plan', userId, todayIso],
    queryFn: async (): Promise<MyPlan> => {
      const [items, notes, checks, shares, log] = await Promise.all([
        supabase
          .from('plan_items')
          .select('*, professionals(specialty, profiles(full_name, avatar_seed))')
          .eq('person_id', userId)
          .order('position'),
        supabase.from('plan_notes').select('*').eq('person_id', userId),
        supabase.from('plan_checks').select('item_id').eq('person_id', userId).eq('check_date', todayIso),
        supabase
          .from('shares')
          .select('*, professionals(specialty, profiles(full_name, avatar_seed))')
          .eq('person_id', userId)
          .order('created_at', { ascending: false }),
        supabase.from('daily_logs').select('pain_level').eq('user_id', userId).eq('log_date', todayIso).maybeSingle(),
      ])
      const byPro = new Map<string, ShareWithAuthor>()
      // Mais recente primeiro: um compartilhamento ativo vence um antigo revogado.
      for (const s of unwrap<ShareWithAuthor[]>(shares)) {
        const prev = byPro.get(s.professional_id)
        if (!prev || (prev.revoked_at && !s.revoked_at)) byPro.set(s.professional_id, s)
      }
      return {
        items: unwrap<PersonPlanItem[]>(items),
        notes: unwrap<PlanNote[]>(notes),
        doneToday: new Set(unwrap<{ item_id: string }[]>(checks).map((c) => c.item_id)),
        shares: byPro,
        painToday: unwrap<{ pain_level: number | null } | null>(log)?.pain_level ?? null,
      }
    },
  })
}

export function useTogglePlanCheck() {
  const userId = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ itemId, done }: { itemId: string; done: boolean }) => {
      const date = today()
      if (done) {
        unwrap(
          await supabase
            .from('plan_checks')
            .upsert({ item_id: itemId, person_id: userId, check_date: date }, { onConflict: 'item_id,check_date' }),
        )
      } else {
        unwrap(await supabase.from('plan_checks').delete().eq('item_id', itemId).eq('check_date', date))
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['plan', userId] }),
  })
}

/** Dor de hoje (0 a 10), guardada junto com os outros registros do dia. */
export function useSetPain() {
  const userId = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (level: number) =>
      unwrap(
        await supabase
          .from('daily_logs')
          .upsert({ user_id: userId, log_date: today(), pain_level: level }, { onConflict: 'user_id,log_date' }),
      ),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['plan', userId] })
      qc.invalidateQueries({ queryKey: ['daily_logs', userId] })
    },
  })
}

// ------------------------------------------------------------ profissional

export interface PatientPlan {
  items: PlanItem[]
  note: PlanNote | null
  /** Marcações dos últimos 8 dias (para a adesão da semana) */
  checks: Pick<PlanCheck, 'item_id' | 'check_date'>[]
}

export function usePatientPlan(personId: string | undefined) {
  const proId = useUserId()
  return useQuery({
    queryKey: ['patient_plan', proId, personId],
    enabled: Boolean(personId),
    queryFn: async (): Promise<PatientPlan> => {
      const [items, note, checks] = await Promise.all([
        supabase.from('plan_items').select('*').eq('professional_id', proId).eq('person_id', personId!).order('position'),
        supabase.from('plan_notes').select('*').eq('professional_id', proId).eq('person_id', personId!).maybeSingle(),
        supabase
          .from('plan_checks')
          .select('item_id, check_date')
          .eq('person_id', personId!)
          .gte('check_date', addDays(today(), -8)),
      ])
      return {
        items: unwrap<PlanItem[]>(items),
        note: unwrap<PlanNote | null>(note),
        checks: unwrap<Pick<PlanCheck, 'item_id' | 'check_date'>[]>(checks),
      }
    },
  })
}

export function useSavePlanItem(personId: string) {
  const proId = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, row, position }: { id?: string; row: PlanItemRow; position: number }) => {
      if (id) unwrap(await supabase.from('plan_items').update(row).eq('id', id))
      else
        unwrap(await supabase.from('plan_items').insert({ ...row, position, professional_id: proId, person_id: personId }))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['patient_plan', proId, personId] }),
  })
}

export function useDeletePlanItem(personId: string) {
  const proId = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('plan_items').delete().eq('id', id)),
    onSettled: () => qc.invalidateQueries({ queryKey: ['patient_plan', proId, personId] }),
  })
}

/**
 * Salva o recado geral. Update e insert separados de propósito: o banco só deixa
 * alterar o texto, e um "upsert" tentaria regravar o dono e o paciente.
 * Texto vazio apaga o recado.
 */
export function useSavePlanNote(personId: string) {
  const proId = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ note, exists }: { note: string; exists: boolean }) => {
      const text = note.trim()
      const where = { professional_id: proId, person_id: personId }
      if (!text) {
        if (exists) unwrap(await supabase.from('plan_notes').delete().match(where))
      } else if (exists) unwrap(await supabase.from('plan_notes').update({ note: text }).match(where))
      else unwrap(await supabase.from('plan_notes').insert({ ...where, note: text }))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['patient_plan', proId, personId] }),
  })
}
