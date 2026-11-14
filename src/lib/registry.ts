// Regras da verificação do registro de conselho. Espelham a migration
// 20261115000001_aprovacao_registros.sql para o erro aparecer na tela antes de
// chegar ao banco, que continua sendo quem garante as regras.

import type { Professional, Specialty } from './database.types'

export type VerificationStatus = 'pendente' | 'aprovado' | 'recusado'

export const REJECTION_MIN = 10
export const REJECTION_MAX = 300

/** Motivos prontos para a equipe não precisar digitar os casos mais comuns. */
export const REJECTION_PRESETS = [
  'Número não encontrado na consulta do conselho.',
  'O nome no conselho é diferente do nome do perfil.',
  'O registro está inativo ou suspenso no conselho.',
  'O registro é de outra profissão. Confira a especialidade.',
] as const

export function verificationStatus(p: Pick<Professional, 'verified' | 'rejection_reason'>): VerificationStatus {
  if (p.verified) return 'aprovado'
  if (p.rejection_reason) return 'recusado'
  return 'pendente'
}

export const STATUS_LABEL: Record<VerificationStatus, string> = {
  pendente: 'Em verificação',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
}

export interface Council {
  /** Sigla do conselho federal */
  acronym: string
  name: string
  url: string
  /** "consulta" = abre direto a busca de profissionais; "site" = página inicial do conselho */
  kind: 'consulta' | 'site'
}

/**
 * Onde conferir o registro de cada especialidade. CFP e CFN têm consulta
 * nacional pública; para CONFEF e COFFITO a consulta é feita no site do
 * conselho (ou no regional), então o link abre a página inicial.
 */
export const COUNCILS: Record<Specialty, Council> = {
  psicologo: {
    acronym: 'CFP',
    name: 'Conselho Federal de Psicologia',
    url: 'https://cadastro.cfp.org.br/',
    kind: 'consulta',
  },
  nutricionista: {
    acronym: 'CFN',
    name: 'Conselho Federal de Nutrição',
    url: 'https://cfn.org.br/consulta-nacional-de-nutricionistas/',
    kind: 'consulta',
  },
  personal: {
    acronym: 'CONFEF',
    name: 'Conselho Federal de Educação Física',
    url: 'https://www.confef.org.br/',
    kind: 'site',
  },
  fisioterapeuta: {
    acronym: 'COFFITO',
    name: 'Conselho Federal de Fisioterapia e Terapia Ocupacional',
    url: 'https://www.coffito.gov.br/',
    kind: 'site',
  },
}

/** Erro do motivo da recusa, ou null se estiver bom. */
export function validateRejectionReason(raw: string): string | null {
  const reason = raw.trim()
  if (reason.length < REJECTION_MIN) return `Explique o motivo em pelo menos ${REJECTION_MIN} caracteres.`
  if (reason.length > REJECTION_MAX) return `Use no máximo ${REJECTION_MAX} caracteres.`
  return null
}

/** Traduz os erros da função review_professional() para quem está na tela. */
export function reviewErrorMessage(message: string): string {
  if (message.includes('registro_mudou'))
    return 'O profissional mudou o registro enquanto você conferia. A lista foi atualizada: confira de novo.'
  if (message.includes('demo_so_decide_perfis_demo'))
    return 'A conta demo da equipe só pode decidir sobre perfis de demonstração.'
  if (message.includes('motivo_invalido')) return `Explique o motivo em ${REJECTION_MIN} a ${REJECTION_MAX} caracteres.`
  if (message.includes('sem_permissao')) return 'Só a equipe Skyro pode aprovar ou recusar registros.'
  if (message.includes('sem_registro')) return 'Este profissional ainda não informou o registro.'
  if (message.includes('profissional_nao_encontrado')) return 'Este profissional não existe mais.'
  if (/failed to fetch|network/i.test(message)) return 'Sem conexão com o servidor. Verifique sua internet.'
  return message
}

/** Fila da equipe: pendentes por ordem de chegada (quem esperou mais vem primeiro). */
export function pendingQueue<T extends Pick<Professional, 'verified' | 'rejection_reason' | 'registry' | 'created_at'>>(
  pros: T[],
): T[] {
  return pros
    .filter((p) => p.registry && verificationStatus(p) === 'pendente')
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
}

/** Já decididos: os mais recentes primeiro; os aprovados antes do app (sem data) vão para o fim. */
export function decidedList<T extends Pick<Professional, 'verified' | 'rejection_reason' | 'reviewed_at'>>(pros: T[]): T[] {
  return pros
    .filter((p) => verificationStatus(p) !== 'pendente')
    .sort((a, b) => (b.reviewed_at ?? '').localeCompare(a.reviewed_at ?? ''))
}
