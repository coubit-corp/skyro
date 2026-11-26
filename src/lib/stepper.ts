// Contador com + e − (sono, água, foco). Quando ainda não há valor (null), o primeiro toque
// parte de uma sugestão e a pessoa confirma o que de fato aconteceu, em vez de a tela
// gravar um número que ela nunca informou.

export interface StepperOptions {
  step: number
  min: number
  max: number
  /** ponto de partida quando ainda não há valor; sem sugestão, parte do mínimo */
  suggested?: number
}

const round2 = (v: number) => Math.round(v * 100) / 100

/** Próximo valor depois de tocar em + (direction = 1) ou − (direction = -1). */
export function stepValue(value: number | null, direction: 1 | -1, { step, min, max, suggested }: StepperOptions): number {
  const base = value ?? suggested ?? min
  return Math.min(max, Math.max(min, round2(base + direction * step)))
}
