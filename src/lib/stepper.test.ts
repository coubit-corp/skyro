import { describe, expect, it } from 'vitest'
import { stepValue } from './stepper'

const sono = { step: 0.5, min: 0, max: 14, suggested: 7 }

describe('stepValue', () => {
  it('soma e subtrai o passo a partir do valor atual', () => {
    expect(stepValue(6, 1, sono)).toBe(6.5)
    expect(stepValue(6, -1, sono)).toBe(5.5)
  })

  it('sem valor, o primeiro toque parte da sugestão', () => {
    expect(stepValue(null, 1, sono)).toBe(7.5)
    expect(stepValue(null, -1, sono)).toBe(6.5)
  })

  it('sem valor e sem sugestão, parte do mínimo', () => {
    expect(stepValue(null, 1, { step: 0.25, min: 0, max: 6 })).toBe(0.25)
    expect(stepValue(null, -1, { step: 0.25, min: 0, max: 6 })).toBe(0)
  })

  it('respeita os limites', () => {
    expect(stepValue(0, -1, sono)).toBe(0)
    expect(stepValue(14, 1, sono)).toBe(14)
  })

  it('não acumula erro de ponto flutuante', () => {
    expect(stepValue(0.1, 1, { step: 0.2, min: 0, max: 1 })).toBe(0.3)
  })
})
