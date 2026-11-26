import { describe, expect, it } from 'vitest'
import { nextStep } from './nextStep'

const h = (id: string, scheduled_time: string | null) => ({ id, name: id, scheduled_time })
const habitos = [h('acordar', '06:30:00'), h('treino', '07:00:00'), h('foco', '15:00:00'), h('dormir', '23:00:00'), h('agua', null)]
const min = (hh: number, mm = 0) => hh * 60 + mm

describe('nextStep', () => {
  it('escolhe o próximo com horário que ainda não passou', () => {
    expect(nextStep(habitos, new Set(), min(6, 0))?.habit.id).toBe('acordar')
    expect(nextStep(habitos, new Set(['acordar']), min(6, 45))?.habit.id).toBe('treino')
    expect(nextStep(habitos, new Set(['acordar', 'treino']), min(10))?.habit.id).toBe('foco')
  })

  it('um hábito no minuto exato ainda conta como próximo', () => {
    expect(nextStep(habitos, new Set(['acordar']), min(7, 0))).toEqual({ habit: habitos[1], status: 'proximo' })
  })

  it('ignora o que já foi marcado, mesmo se o horário não passou', () => {
    expect(nextStep(habitos, new Set(['foco']), min(14))?.habit.id).toBe('dormir')
  })

  it('depois do último horário, cai no hábito de dia todo', () => {
    expect(nextStep(habitos, new Set(['dormir']), min(23, 30))).toEqual({ habit: habitos[4], status: 'dia_todo' })
  })

  it('sem nada de dia todo, retoma o último com horário que passou', () => {
    const r = nextStep([h('a', '06:30'), h('b', '07:00')], new Set(), min(20))
    expect(r).toEqual({ habit: { id: 'b', name: 'b', scheduled_time: '07:00' }, status: 'atrasado' })
  })

  it('devolve null quando tudo foi marcado ou não há hábitos', () => {
    expect(nextStep(habitos, new Set(habitos.map((x) => x.id)), min(12))).toBeNull()
    expect(nextStep([], new Set(), min(12))).toBeNull()
  })
})
