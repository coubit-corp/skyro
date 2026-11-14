// Consultas e alterações dos dados da pessoa logada (React Query + Supabase).
// Toda alteração invalida as consultas afetadas, para as telas se atualizarem sozinhas.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/auth-context'
import type { DailyLog, Habit, HabitKind, Professional, ProfileBrief, Share, Tip } from '../lib/database.types'
import { addDays, today } from '../lib/dates'
import { PRO_PROFILE, supabase } from '../lib/supabase'

/** Profissional com nome e avatar (join com profiles). */
export type ProfessionalWithProfile = Professional & {
  profiles: ProfileBrief
}

export type ShareWithProfessional = Share & { professionals: ProfessionalWithProfile }

export type TipWithAuthor = Tip & {
  professionals: { specialty: Professional['specialty']; profiles: ProfileBrief }
}

const PRO_SELECT = `*, ${PRO_PROFILE}`

/** Lança o erro do Supabase para o React Query mostrar o estado de erro. */
function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

function useUserId(): string {
  const { session } = useAuth()
  if (!session) throw new Error('Usuário não autenticado')
  return session.user.id
}

// ----------------------------------------------------------------- hábitos

export function useHabits() {
  const userId = useUserId()
  return useQuery({
    queryKey: ['habits', userId],
    queryFn: async () =>
      unwrap<Habit[]>(
        await supabase
          .from('habits')
          .select('*')
          .eq('user_id', userId)
          .eq('active', true)
          .order('scheduled_time', { ascending: true, nullsFirst: false }),
      ),
  })
}

/** Datas (YYYY-MM-DD) com marcações de cada hábito, dos últimos `days` dias. */
export function useHabitChecks(days = 60) {
  const userId = useUserId()
  const from = addDays(today(), -days)
  return useQuery({
    queryKey: ['habit_checks', userId, from],
    queryFn: async () =>
      unwrap<{ habit_id: string; check_date: string }[]>(
        await supabase.from('habit_checks').select('habit_id, check_date').eq('user_id', userId).gte('check_date', from),
      ),
  })
}

export function useToggleHabit() {
  const userId = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ habitId, date, done }: { habitId: string; date: string; done: boolean }) => {
      if (done) {
        unwrap(
          await supabase
            .from('habit_checks')
            .upsert({ habit_id: habitId, user_id: userId, check_date: date }, { onConflict: 'habit_id,check_date' }),
        )
      } else {
        unwrap(await supabase.from('habit_checks').delete().eq('habit_id', habitId).eq('check_date', date))
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['habit_checks', userId] }),
  })
}

export function useAddHabit() {
  const userId = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (h: { name: string; kind: HabitKind; scheduled_time: string | null; goal: string | null }) =>
      unwrap(await supabase.from('habits').insert({ ...h, user_id: userId })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits', userId] }),
  })
}

export function useArchiveHabit() {
  const userId = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (habitId: string) =>
      unwrap(await supabase.from('habits').update({ active: false }).eq('id', habitId)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits', userId] }),
  })
}

// ----------------------------------------------------------- registro do dia

export function useDailyLogs(days = 14) {
  const userId = useUserId()
  const from = addDays(today(), -days)
  return useQuery({
    queryKey: ['daily_logs', userId, from],
    queryFn: async () =>
      unwrap<DailyLog[]>(
        await supabase
          .from('daily_logs')
          .select('*')
          .eq('user_id', userId)
          .gte('log_date', from)
          .order('log_date', { ascending: false }),
      ),
  })
}

export type DailyLogInput = Pick<
  DailyLog,
  'log_date' | 'sleep_hours' | 'water_liters' | 'focus_minutes' | 'workout_planned' | 'workout_done'
>

export function useSaveDailyLog() {
  const userId = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (log: DailyLogInput) =>
      unwrap(
        await supabase.from('daily_logs').upsert({ ...log, user_id: userId }, { onConflict: 'user_id,log_date' }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['daily_logs', userId] }),
  })
}

// ------------------------------------------------------------ dicas recebidas

export function useLatestTip() {
  const userId = useUserId()
  return useQuery({
    queryKey: ['tips', userId, 'latest'],
    queryFn: async () =>
      unwrap<TipWithAuthor | null>(
        await supabase
          .from('tips')
          .select(`*, professionals(specialty, ${PRO_PROFILE})`)
          .eq('person_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ),
  })
}

export function useMarkTipRead() {
  const userId = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (tipId: string) =>
      unwrap(await supabase.from('tips').update({ read_at: new Date().toISOString() }).eq('id', tipId)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tips', userId] }),
  })
}

// ------------------------------------------------- profissionais e equipe

export function useProfessionals() {
  return useQuery({
    queryKey: ['professionals'],
    queryFn: async () => unwrap<ProfessionalWithProfile[]>(await supabase.from('professionals').select(PRO_SELECT)),
    staleTime: 5 * 60 * 1000,
  })
}

export function useProfessional(id: string | undefined) {
  return useQuery({
    queryKey: ['professionals', id],
    enabled: Boolean(id),
    queryFn: async () =>
      unwrap<ProfessionalWithProfile | null>(
        await supabase.from('professionals').select(PRO_SELECT).eq('id', id!).maybeSingle(),
      ),
  })
}

/** Compartilhamentos ativos da pessoa = a "equipe" dela. */
export function useMyTeam() {
  const userId = useUserId()
  return useQuery({
    queryKey: ['shares', userId],
    queryFn: async () =>
      unwrap<ShareWithProfessional[]>(
        await supabase
          .from('shares')
          .select(`*, professionals(${PRO_SELECT})`)
          .eq('person_id', userId)
          .is('revoked_at', null)
          .order('created_at', { ascending: true }),
      ),
  })
}

export function useShareRoutine() {
  const userId = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (professionalId: string) =>
      unwrap(await supabase.from('shares').insert({ person_id: userId, professional_id: professionalId })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shares', userId] }),
  })
}

export function useRevokeShare() {
  const userId = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (shareId: string) =>
      unwrap(await supabase.from('shares').update({ revoked_at: new Date().toISOString() }).eq('id', shareId)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shares', userId] }),
  })
}
