import { describe, expect, it } from 'vitest'
import {
  COUNCILS,
  decidedList,
  pendingQueue,
  REJECTION_PRESETS,
  reviewErrorMessage,
  validateRejectionReason,
  verificationStatus,
} from './registry'
import { SPECIALTIES } from './specialties'

function pro(over: Partial<{ id: string; verified: boolean; rejection_reason: string | null; registry: string | null; created_at: string; reviewed_at: string | null }>) {
  return {
    id: 'x',
    verified: false,
    rejection_reason: null,
    registry: 'CRN-3 12345',
    created_at: '2026-11-10T12:00:00Z',
    reviewed_at: null,
    ...over,
  }
}

describe('situação do registro', () => {
  it('aprovado, recusado ou pendente', () => {
    expect(verificationStatus(pro({ verified: true }))).toBe('aprovado')
    expect(verificationStatus(pro({ rejection_reason: 'Número não encontrado.' }))).toBe('recusado')
    expect(verificationStatus(pro({}))).toBe('pendente')
  })
})

describe('motivo da recusa', () => {
  it('exige de 10 a 300 caracteres, sem contar espaços nas pontas', () => {
    expect(validateRejectionReason('   curto   ')).not.toBeNull()
    expect(validateRejectionReason('Número não encontrado.')).toBeNull()
    expect(validateRejectionReason('a'.repeat(301))).not.toBeNull()
    expect(validateRejectionReason(`  ${'a'.repeat(300)}  `)).toBeNull()
  })
  it('os motivos prontos passam na mesma regra do banco', () => {
    for (const r of REJECTION_PRESETS) expect(validateRejectionReason(r)).toBeNull()
  })
})

describe('conselhos', () => {
  it('toda especialidade tem um conselho com link https', () => {
    for (const s of SPECIALTIES) {
      expect(COUNCILS[s.value].url).toMatch(/^https:\/\//)
      expect(COUNCILS[s.value].acronym.length).toBeGreaterThan(1)
    }
  })
})

describe('listas da equipe', () => {
  it('pendentes: só quem tem registro, por ordem de chegada', () => {
    const list = pendingQueue([
      pro({ id: 'novo', created_at: '2026-11-14T10:00:00Z' }),
      pro({ id: 'antigo', created_at: '2026-11-01T10:00:00Z' }),
      pro({ id: 'sem-registro', registry: null }),
      pro({ id: 'aprovado', verified: true }),
      pro({ id: 'recusado', rejection_reason: 'Número não encontrado.' }),
    ])
    expect(list.map((p) => p.id)).toEqual(['antigo', 'novo'])
  })
  it('decididos: mais recentes primeiro, sem data no fim', () => {
    const list = decidedList([
      pro({ id: 'seed', verified: true }),
      pro({ id: 'ontem', verified: true, reviewed_at: '2026-11-13T15:00:00Z' }),
      pro({ id: 'hoje', rejection_reason: 'Número não encontrado.', reviewed_at: '2026-11-14T09:00:00Z' }),
      pro({ id: 'pendente' }),
    ])
    expect(list.map((p) => p.id)).toEqual(['hoje', 'ontem', 'seed'])
  })
})

describe('erros da função de revisão', () => {
  it('traduz os códigos do banco', () => {
    expect(reviewErrorMessage('registro_mudou')).toMatch(/mudou o registro/)
    expect(reviewErrorMessage('demo_so_decide_perfis_demo')).toMatch(/demonstração/)
    expect(reviewErrorMessage('sem_permissao')).toMatch(/equipe/)
    expect(reviewErrorMessage('TypeError: Failed to fetch')).toMatch(/conexão/)
    expect(reviewErrorMessage('outra coisa')).toBe('outra coisa')
  })
})
