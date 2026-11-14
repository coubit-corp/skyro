// Consultas da área da equipe Skyro. Quem garante que só a equipe aprova ou
// recusa é o banco (função review_professional); aqui só buscamos e chamamos.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Professional, ProfileBrief } from '../lib/database.types'
import { reviewErrorMessage } from '../lib/registry'
import { PRO_PROFILE, supabase } from '../lib/supabase'

export type RegistryRow = Professional & { profiles: ProfileBrief }

export type Decision = 'aprovado' | 'recusado'

/** Todos os profissionais com registro (a equipe enxerga também os recusados). */
export function useRegistries() {
  return useQuery({
    queryKey: ['registries'],
    queryFn: async (): Promise<RegistryRow[]> => {
      const { data, error } = await supabase
        .from('professionals')
        .select(`*, ${PRO_PROFILE}`)
        .not('registry', 'is', null)
      if (error) throw new Error(error.message)
      return data as RegistryRow[]
    },
  })
}

export function useReviewRegistry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { professionalId: string; decision: Decision; registry: string; reason?: string }) => {
      const { error } = await supabase.rpc('review_professional', {
        p_professional: v.professionalId,
        p_decision: v.decision,
        p_registry: v.registry,
        p_reason: v.decision === 'recusado' ? v.reason?.trim() : null,
      })
      if (error) throw new Error(reviewErrorMessage(error.message))
    },
    // Sucesso ou erro (ex.: o registro mudou), a lista volta do banco atualizada.
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['registries'] })
      qc.invalidateQueries({ queryKey: ['professionals'] })
    },
  })
}
