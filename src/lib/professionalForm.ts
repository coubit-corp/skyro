// Regras do formulário de perfil profissional. Espelham as restrições do banco
// (migration 20261114000002) para o erro aparecer na tela, antes de salvar.

import type { Modality, Professional, Specialty } from './database.types'

export const BIO_MAX = 400
export const BIO_MIN = 20
export const TAGS_MAX = 6
export const TAG_MAX_LEN = 30

export interface ProfessionalFormValues {
  fullName: string
  specialty: Specialty | ''
  registry: string
  bio: string
  tags: string[]
  modality: Modality
  lat: number | null
  lng: number | null
  neighborhood: string
  city: string
}

export type FormErrors = Partial<Record<keyof ProfessionalFormValues | 'location', string>>

/** Exemplo de registro por conselho, para o placeholder do campo. */
export const REGISTRY_EXAMPLE: Record<Specialty, string> = {
  nutricionista: 'CRN-3 12345',
  psicologo: 'CRP 06/123456',
  personal: 'CREF 123456-G/SP',
  fisioterapeuta: 'CREFITO-3 123456-F',
}

export function needsLocation(modality: Modality): boolean {
  return modality !== 'online'
}

/** Normaliza uma especialidade digitada: tira espaços extras e limita o tamanho. */
export function cleanTag(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, TAG_MAX_LEN)
}

/** Adiciona uma tag sem repetir (ignorando maiúsculas) e respeitando o limite. */
export function addTag(tags: string[], raw: string): string[] {
  const tag = cleanTag(raw)
  if (tag.length < 2 || tags.length >= TAGS_MAX) return tags
  if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return tags
  return [...tags, tag]
}

export function validateProfessional(v: ProfessionalFormValues): FormErrors {
  const e: FormErrors = {}
  if (v.fullName.trim().length < 3) e.fullName = 'Informe seu nome completo.'
  if (!v.specialty) e.specialty = 'Escolha sua especialidade.'

  const reg = v.registry.trim()
  if (reg.length < 4 || reg.length > 40 || !/\d/.test(reg)) {
    e.registry = 'Informe o registro no conselho, com o número (ex.: CRN-3 12345).'
  }

  const bio = v.bio.trim()
  if (bio.length < BIO_MIN) e.bio = `Conte um pouco sobre você (pelo menos ${BIO_MIN} caracteres).`
  else if (bio.length > BIO_MAX) e.bio = `Use no máximo ${BIO_MAX} caracteres.`

  if (v.tags.length > TAGS_MAX) e.tags = `No máximo ${TAGS_MAX} especialidades.`

  if (needsLocation(v.modality)) {
    if (v.lat == null || v.lng == null) e.location = 'Marque no mapa onde você atende (ou busque o endereço).'
    if (!v.neighborhood.trim()) e.neighborhood = 'Informe o bairro.'
  }
  return e
}

/** Linha pronta para gravar em `professionals` (local some se for só online). */
export function toProfessionalRow(v: ProfessionalFormValues) {
  const presencial = needsLocation(v.modality)
  return {
    specialty: v.specialty as Specialty,
    registry: v.registry.trim(),
    bio: v.bio.trim(),
    tags: v.tags,
    modality: v.modality,
    lat: presencial ? v.lat : null,
    lng: presencial ? v.lng : null,
    neighborhood: presencial ? v.neighborhood.trim() : null,
    city: v.city.trim() || 'São Paulo',
  }
}

/** Valores iniciais do formulário: vazio no cadastro, preenchido na edição. */
export function initialValues(fullName: string, p: Professional | null | undefined): ProfessionalFormValues {
  return {
    fullName,
    specialty: p?.specialty ?? '',
    registry: p?.registry ?? '',
    bio: p?.bio ?? '',
    tags: p?.tags ?? [],
    modality: p?.modality ?? 'ambos',
    lat: p?.lat ?? null,
    lng: p?.lng ?? null,
    neighborhood: p?.neighborhood ?? '',
    city: p?.city ?? 'São Paulo',
  }
}
