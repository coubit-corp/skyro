// Consultas do painel do profissional. Quem garante que ele só vê pacientes
// que compartilharam é o banco (RLS); aqui só buscamos e organizamos.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/auth-context'
import { evaluatePatient, type PatientStatus } from '../lib/alerts'
import type { toProfessionalRow } from '../lib/professionalForm'
import type { DailyLog, Habit, Professional, ProfileBrief, Share, Tip } from '../lib/database.types'
import { addDays, today } from '../lib/dates'
import { currentStreak } from '../lib/streak'
import { supabase } from '../lib/supabase'

type ProfessionalRow = ReturnType<typeof toProfessionalRow> & { availability?: Record<string, [string, string] | undefined> }
type PersonProfile = ProfileBrief
export type PatientShare = Share & { profiles: PersonProfile }

export interface PatientRow {
  id: string
  name: string
  avatarSeed: string | null
  avatarPath: string | null
  since: string
  evaluation: PatientStatus
  streak: number
}

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

function useProId(): string {
  const { session } = useAuth()
  if (!session) throw new Error('Usuário não autenticado')
  return session.user.id
}

/** O próprio cadastro profissional (pode não existir para contas criadas pelo formulário). */
export function useMyProfessional() {
  const proId = useProId()
  return useQuery({
    queryKey: ['professionals', proId],
    queryFn: async () =>
      unwrap<Professional | null>(await supabase.from('professionals').select('*').eq('id', proId).maybeSingle()),
  })
}

/** Lista de pacientes com o status calculado pelas regras de alerta. Atenção primeiro. */
export function usePatients() {
  const proId = useProId()
  return useQuery({
    queryKey: ['patients', proId],
    queryFn: async (): Promise<PatientRow[]> => {
      const shares = unwrap<PatientShare[]>(
        await supabase
          .from('shares')
          .select('*, profiles(full_name, avatar_seed, avatar_path)')
          .eq('professional_id', proId)
          .is('revoked_at', null),
      )
      if (shares.length === 0) return []

      const ids = shares.map((s) => s.person_id)
      const todayIso = today()
      const [logs, checks] = await Promise.all([
        supabase.from('daily_logs').select('*').in('user_id', ids).gte('log_date', addDays(todayIso, -14)),
        supabase.from('habit_checks').select('user_id, check_date').in('user_id', ids).gte('check_date', addDays(todayIso, -60)),
      ])
      const allLogs = unwrap<DailyLog[]>(logs)
      const allChecks = unwrap<{ user_id: string; check_date: string }[]>(checks)

      return shares
        .map((s) => {
          const days = new Set(allChecks.filter((c) => c.user_id === s.person_id).map((c) => c.check_date))
          return {
            id: s.person_id,
            name: s.profiles.full_name,
            avatarSeed: s.profiles.avatar_seed,
            avatarPath: s.profiles.avatar_path,
            since: s.created_at,
            evaluation: evaluatePatient(allLogs.filter((l) => l.user_id === s.person_id), todayIso),
            streak: currentStreak(days, todayIso),
          }
        })
        .sort((a, b) => {
          if (a.evaluation.status !== b.evaluation.status) return a.evaluation.status === 'atencao' ? -1 : 1
          return b.evaluation.alerts.length - a.evaluation.alerts.length || a.name.localeCompare(b.name, 'pt-BR')
        })
    },
  })
}

export interface PatientDetail {
  share: PatientShare
  logs: DailyLog[]
  habits: Habit[]
  checkDays: Set<string>
  tips: Tip[]
}

/** Tudo da ficha de um paciente. Retorna null se ele não compartilha (ou revogou). */
export function usePatient(personId: string | undefined) {
  const proId = useProId()
  return useQuery({
    queryKey: ['patient', proId, personId],
    enabled: Boolean(personId),
    queryFn: async (): Promise<PatientDetail | null> => {
      const share = unwrap<PatientShare | null>(
        await supabase
          .from('shares')
          .select('*, profiles(full_name, avatar_seed, avatar_path)')
          .eq('professional_id', proId)
          .eq('person_id', personId!)
          .is('revoked_at', null)
          .maybeSingle(),
      )
      if (!share) return null

      const todayIso = today()
      const [logs, habits, checks, tips] = await Promise.all([
        supabase.from('daily_logs').select('*').eq('user_id', personId!).gte('log_date', addDays(todayIso, -14)).order('log_date'),
        supabase.from('habits').select('*').eq('user_id', personId!).eq('active', true).order('scheduled_time', { nullsFirst: false }),
        supabase.from('habit_checks').select('check_date').eq('user_id', personId!).gte('check_date', addDays(todayIso, -60)),
        supabase.from('tips').select('*').eq('professional_id', proId).eq('person_id', personId!).order('created_at', { ascending: false }).limit(10),
      ])
      return {
        share,
        logs: unwrap<DailyLog[]>(logs),
        habits: unwrap<Habit[]>(habits),
        checkDays: new Set(unwrap<{ check_date: string }[]>(checks).map((c) => c.check_date)),
        tips: unwrap<Tip[]>(tips),
      }
    },
  })
}

export function useSendTip() {
  const proId = useProId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ personId, body }: { personId: string; body: string }) =>
      unwrap(await supabase.from('tips').insert({ professional_id: proId, person_id: personId, body })),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['patient', proId, v.personId] }),
  })
}

export type AiSummaryResult =
  | { ok: true; source: 'ia' | 'cache'; lines: string[]; attention: string; model: string }
  | { ok: false; reason: string }

/**
 * Resumo da semana escrito por IA (Edge Function "resumo-semanal").
 * Nunca lança erro: se a IA estiver desligada ou falhar, devolve ok=false
 * e a tela continua mostrando o resumo por regras.
 */
export function useAiSummary(personId: string | undefined, alerts: string[], enabled: boolean) {
  const proId = useProId()
  return useQuery({
    queryKey: ['ai_summary', proId, personId, alerts],
    enabled: Boolean(personId) && enabled,
    staleTime: 10 * 60 * 1000,
    retry: false,
    queryFn: async (): Promise<AiSummaryResult> => {
      const { data, error } = await supabase.functions.invoke('resumo-semanal', { body: { personId, alerts } })
      if (error) {
        // O corpo do erro traz o motivo (ex.: "ia_desligada"); se não der para ler, segue genérico.
        let reason = 'ia_indisponivel'
        try {
          const ctx = (error as { context?: Response }).context
          if (ctx) reason = ((await ctx.json()) as { error?: string }).error ?? reason
        } catch {
          /* mantém o motivo genérico */
        }
        return { ok: false, reason }
      }
      const d = data as { source: 'ia' | 'cache' | 'desligada'; lines: string[]; attention: string; model: string }
      if (d?.source === 'desligada') return { ok: false, reason: 'ia_desligada' }
      if (!Array.isArray(d?.lines) || typeof d.attention !== 'string') return { ok: false, reason: 'ia_formato_invalido' }
      return { ok: true, source: d.source, lines: d.lines, attention: d.attention, model: d.model }
    },
  })
}

/**
 * Cria ou atualiza o perfil profissional (e o nome no perfil da conta).
 * Insert e update são separados de propósito: o banco só deixa o profissional
 * alterar algumas colunas, e um "upsert" tentaria regravar todas.
 */
export function useSaveProfessional() {
  const proId = useProId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      fullName,
      row,
      exists,
    }: {
      fullName: string
      row: ProfessionalRow
      exists: boolean
    }) => {
      unwrap(await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('id', proId))
      if (exists) unwrap(await supabase.from('professionals').update(row).eq('id', proId))
      else unwrap(await supabase.from('professionals').insert({ id: proId, ...row }))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['professionals', proId] })
    },
  })
}
