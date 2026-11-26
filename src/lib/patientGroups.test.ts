import { describe, expect, it } from 'vitest'
import type { Alert } from './alerts'
import { attentionSummary, groupOf, groupPatients } from './patientGroups'

const alert = (kind: Alert['kind']): Alert => ({ kind, message: kind })
const atencao = (...kinds: Alert['kind'][]) => ({ status: 'atencao' as const, alerts: kinds.map(alert) })
const emDia = { status: 'em_dia' as const, alerts: [] }

describe('groupOf', () => {
  it('alerta de rotina vai para atenção', () => {
    expect(groupOf(atencao('sono'))).toBe('atencao')
    expect(groupOf(atencao('treino', 'agua'))).toBe('atencao')
  })

  it('só falta de registro fica separado', () => {
    expect(groupOf(atencao('sem_registro'))).toBe('sem_registro')
  })

  it('falta de registro junto com alerta de rotina continua sendo atenção', () => {
    expect(groupOf(atencao('sem_registro', 'treino'))).toBe('atencao')
  })

  it('sem alerta fica em dia', () => {
    expect(groupOf(emDia)).toBe('em_dia')
  })
})

describe('groupPatients', () => {
  it('divide e mantém a ordem original dentro de cada grupo', () => {
    const lista = [
      { n: 'a', evaluation: atencao('sem_registro') },
      { n: 'b', evaluation: atencao('sono') },
      { n: 'c', evaluation: emDia },
      { n: 'd', evaluation: atencao('sem_registro') },
      { n: 'e', evaluation: atencao('agua') },
    ]
    const g = groupPatients(lista)
    expect(g.atencao.map((p) => p.n)).toEqual(['b', 'e'])
    expect(g.sem_registro.map((p) => p.n)).toEqual(['a', 'd'])
    expect(g.em_dia.map((p) => p.n)).toEqual(['c'])
  })
})

describe('attentionSummary', () => {
  it('todos em dia', () => {
    expect(attentionSummary({ atencao: 0, sem_registro: 0, em_dia: 3 }).title).toBe('Todos os pacientes estão em dia')
  })

  it('só sem registro não vira "precisam de atenção"', () => {
    const s = attentionSummary({ atencao: 0, sem_registro: 6, em_dia: 0 })
    expect(s.count).toBe(0)
    expect(s.title).toBe('Nenhum paciente com alerta de rotina')
    expect(s.subtitle).toBe('6 pacientes sem registro recente')
  })

  it('conta atenção e cita os sem registro à parte', () => {
    const s = attentionSummary({ atencao: 2, sem_registro: 1, em_dia: 3 })
    expect(s.count).toBe(2)
    expect(s.title).toBe('pacientes precisam de atenção hoje')
    expect(s.subtitle).toContain('1 paciente sem registro recente')
  })

  it('singular', () => {
    expect(attentionSummary({ atencao: 1, sem_registro: 0, em_dia: 0 }).title).toBe('paciente precisa de atenção hoje')
  })
})
