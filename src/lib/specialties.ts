import type { Modality, Specialty } from './database.types'

export const SPECIALTIES: { value: Specialty; label: string; plural: string; letter: string }[] = [
  { value: 'personal', label: 'Personal', plural: 'Personal trainers', letter: 'P' },
  { value: 'nutricionista', label: 'Nutricionista', plural: 'Nutricionistas', letter: 'N' },
  { value: 'psicologo', label: 'Psicólogo', plural: 'Psicólogos', letter: 'Ψ' },
  { value: 'fisioterapeuta', label: 'Fisioterapia', plural: 'Fisioterapeutas', letter: 'F' },
]

export function specialtyLabel(s: Specialty): string {
  return SPECIALTIES.find((x) => x.value === s)?.label ?? s
}

export function specialtyLetter(s: Specialty): string {
  return SPECIALTIES.find((x) => x.value === s)?.letter ?? '?'
}

export const MODALITY_LABEL: Record<Modality, string> = {
  presencial: 'Presencial',
  online: 'Só online',
  ambos: 'Presencial e online',
}

/** Dados que o profissional passa a ver quando a pessoa compartilha (mostrado no consentimento). */
export const SHARED_DATA = ['Sono', 'Treinos', 'Água', 'Tempo de foco', 'Hábitos marcados'] as const
