import { describe, expect, it } from 'vitest'
import type { PlanItem } from './database.types'
import {
  adherence,
  dayHeadline,
  initialPlanValues,
  isoWeekday,
  isValidVideoUrl,
  itemDetail,
  itemsForDay,
  kindForSpecialty,
  lastWeekDays,
  toPlanItemRow,
  validatePlanItem,
  weekdaysLabel,
} from './plan'

function item(over: Partial<PlanItem>): PlanItem {
  return {
    id: 'i', professional_id: 'p', person_id: 'x', kind: 'treino', title: 'Supino', weekdays: [1, 3, 5],
    sets: 4, reps: '10', load: '30 kg', meal_time: null, foods: null, duration_min: null, notes: null,
    video_url: null, position: 1, created_at: '2026-11-01T12:00:00Z', updated_at: '2026-11-01T12:00:00Z', ...over,
  }
}

describe('plano: especialidades e dias', () => {
  it('cada especialidade monta o seu tipo de item', () => {
    expect(kindForSpecialty('personal')).toBe('treino')
    expect(kindForSpecialty('nutricionista')).toBe('refeicao')
    expect(kindForSpecialty('psicologo')).toBe('respiracao')
    expect(kindForSpecialty('fisioterapeuta')).toBe('fisio')
  })
  it('dia da semana ISO: segunda é 1 e domingo é 7', () => {
    expect(isoWeekday('2026-11-09')).toBe(1)
    expect(isoWeekday('2026-11-13')).toBe(5)
    expect(isoWeekday('2026-11-15')).toBe(7)
  })
  it('descreve os dias em português', () => {
    expect(weekdaysLabel([1, 2, 3, 4, 5, 6, 7])).toBe('Todos os dias')
    expect(weekdaysLabel([5, 4, 3, 2, 1])).toBe('Seg a sex')
    expect(weekdaysLabel([6, 7])).toBe('Fim de semana')
    expect(weekdaysLabel([1, 3, 5])).toBe('Seg, qua e sex')
    expect(weekdaysLabel([2])).toBe('Ter')
  })
})

describe('plano do dia', () => {
  it('mostra só os itens do dia, refeições pelo horário', () => {
    const items = [
      item({ id: 'jantar', kind: 'refeicao', meal_time: '19:30:00', weekdays: [1, 2, 3, 4, 5, 6, 7], position: 1 }),
      item({ id: 'cafe', kind: 'refeicao', meal_time: '07:30:00', weekdays: [1, 2, 3, 4, 5, 6, 7], position: 2 }),
      item({ id: 'so-sabado', kind: 'refeicao', meal_time: '10:00:00', weekdays: [6] }),
    ]
    expect(itemsForDay(items, '2026-11-13').map((i) => i.id)).toEqual(['cafe', 'jantar'])
  })
  it('detalhe de cada tipo', () => {
    expect(itemDetail(item({}))).toBe('4 × 10 · 30 kg')
    expect(itemDetail(item({ kind: 'fisio', sets: 3, reps: '30 s', load: null }))).toBe('3 × 30 s')
    expect(itemDetail(item({ kind: 'refeicao', meal_time: '12:30:00', foods: 'Arroz e feijão' }))).toBe('12:30 · Arroz e feijão')
    expect(itemDetail(item({ kind: 'respiracao', duration_min: 5 }))).toBe('5 min')
  })
  it('título do card do dia', () => {
    expect(dayHeadline('respiracao', [{ duration_min: 5 }, { duration_min: 4 }])).toBe('Respiração de hoje · 9 min')
    expect(dayHeadline('fisio', [{ duration_min: null }])).toBe('1 exercício hoje')
    expect(dayHeadline('refeicao', [])).toBe('Nada para hoje')
  })
})

describe('adesão da semana', () => {
  it('conta o que estava previsto e o que foi feito', () => {
    const items = [item({ id: 'a', weekdays: [1, 3, 5] }), item({ id: 'b', weekdays: [1, 2, 3, 4, 5, 6, 7] })]
    const days = ['2026-11-09', '2026-11-10', '2026-11-11'] // seg, ter, qua
    const checks = [
      { item_id: 'a', check_date: '2026-11-09' },
      { item_id: 'b', check_date: '2026-11-10' },
      { item_id: 'b', check_date: '2026-11-12' }, // fora do período
    ]
    expect(adherence(items, checks, days)).toEqual({ done: 2, planned: 5 })
  })
  it('item novo não cobra os dias antes de existir', () => {
    const items = [item({ id: 'novo', weekdays: [1, 2, 3, 4, 5, 6, 7], created_at: '2026-11-11T15:00:00Z' })]
    expect(adherence(items, [], ['2026-11-09', '2026-11-10', '2026-11-11'])).toEqual({ done: 0, planned: 1 })
  })
  it('a semana termina ontem', () => {
    const w = lastWeekDays('2026-11-13')
    expect(w).toHaveLength(7)
    expect(w[0]).toBe('2026-11-06')
    expect(w[6]).toBe('2026-11-12')
  })
})

describe('formulário do item', () => {
  it('treino exige séries de 1 a 20', () => {
    const v = { ...initialPlanValues(), title: 'Supino', sets: '0' }
    expect(validatePlanItem('treino', v).sets).toBeDefined()
    expect(validatePlanItem('treino', { ...v, sets: '4' })).toEqual({})
  })
  it('refeição exige horário e alimentos', () => {
    const v = { ...initialPlanValues(), title: 'Almoço' }
    const e = validatePlanItem('refeicao', v)
    expect(e.mealTime).toBeDefined()
    expect(e.foods).toBeDefined()
    expect(validatePlanItem('refeicao', { ...v, mealTime: '12:30', foods: 'Arroz' })).toEqual({})
  })
  it('respiração exige duração e todos exigem um dia', () => {
    const v = { ...initialPlanValues(), title: '4-7-8', weekdays: [] }
    const e = validatePlanItem('respiracao', v)
    expect(e.durationMin).toBeDefined()
    expect(e.weekdays).toBeDefined()
  })
  it('vídeo só com https', () => {
    expect(isValidVideoUrl('')).toBe(true)
    expect(isValidVideoUrl('https://youtu.be/abc')).toBe(true)
    expect(isValidVideoUrl('http://youtu.be/abc')).toBe(false)
    expect(isValidVideoUrl('javascript:alert(1)')).toBe(false)
  })
  it('grava só os campos do tipo', () => {
    const v = { ...initialPlanValues(), title: ' Almoço ', mealTime: '12:30', foods: 'Arroz', sets: '4', load: '10 kg', weekdays: [3, 1, 1] }
    const row = toPlanItemRow('refeicao', v)
    expect(row).toMatchObject({ title: 'Almoço', meal_time: '12:30', foods: 'Arroz', sets: null, load: null, weekdays: [1, 3] })
    expect(toPlanItemRow('fisio', { ...v, sets: '3', reps: '15' })).toMatchObject({ sets: 3, reps: '15', load: null, foods: null })
  })
})
