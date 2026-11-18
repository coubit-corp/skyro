// Regras da vitrine do profissional: formação, redes sociais, fotos e vídeos e
// avaliações. Espelham as restrições do banco (migration 20261118000001) para o
// erro aparecer na tela, antes de salvar.

import type { MediaProvider, SocialLinks, SocialNetwork } from './database.types'

export const EDUCATION_MAX = 200
export const EXPERIENCES_MAX = 8
export const EXPERIENCE_MAX_LEN = 120
export const YEARS_MAX = 70
export const BIRTH_YEAR_MIN = 1920
export const BIRTH_YEAR_MAX = 2010
export const MEDIA_MAX = 12
export const CAPTION_MAX = 140
export const COMMENT_MAX = 500
/** Limite do bucket "portfolio" (50 MB, o máximo do plano gratuito do Supabase). */
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024
export const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

// ---------------------------------------------------------------------------
// Redes sociais
// ---------------------------------------------------------------------------

export const SOCIAL_NETWORKS: { key: SocialNetwork; label: string; placeholder: string }[] = [
  { key: 'instagram', label: 'Instagram', placeholder: '@seuperfil' },
  { key: 'facebook', label: 'Facebook', placeholder: 'facebook.com/seuperfil' },
  { key: 'tiktok', label: 'TikTok', placeholder: '@seuperfil' },
  { key: 'youtube', label: 'YouTube', placeholder: 'youtube.com/@seucanal' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/in/seuperfil' },
  { key: 'site', label: 'Site', placeholder: 'seusite.com.br' },
]

const HANDLE = /^@?([A-Za-z0-9._]{1,30})$/

/** Mesmas regras do banco (valid_social_links). */
const SOCIAL_PATTERN: Record<SocialNetwork, RegExp> = {
  instagram: /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._]{1,30}\/?$/,
  facebook: /^https:\/\/(www\.|m\.)?facebook\.com\/[^/?#][^#]*$/,
  tiktok: /^https:\/\/(www\.)?tiktok\.com\/@[A-Za-z0-9._]{1,30}\/?$/,
  youtube: /^https:\/\/(www\.)?youtube\.com\/[^/?#][^#]*$/,
  linkedin: /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/(in|company)\/[^/?#]+\/?$/,
  site: /^https:\/\/[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+(\/[^#]*)?$/,
}

const SOCIAL_ERROR: Record<SocialNetwork, string> = {
  instagram: 'Use o @ ou o link do seu perfil no Instagram.',
  facebook: 'Use o link da sua página no Facebook (facebook.com/…).',
  tiktok: 'Use o @ ou o link do seu perfil no TikTok.',
  youtube: 'Use o link do seu canal no YouTube (youtube.com/@…).',
  linkedin: 'Use o link do seu perfil no LinkedIn (linkedin.com/in/…).',
  site: 'Use o endereço completo do site (ex.: seusite.com.br).',
}

/**
 * Transforma o que a pessoa digitou ("@ana.nutri", "instagram.com/ana",
 * "http://site.com") no link https que o banco aceita. Vazio = sem a rede.
 * Devolve null se não der para entender.
 */
export function normalizeSocial(network: SocialNetwork, raw: string): string | null {
  let v = raw.trim().replace(/\s+/g, '')
  if (!v) return ''
  const handle = HANDLE.exec(v)
  if (handle && (network === 'instagram' || network === 'tiktok') && !v.includes('.com')) {
    v = network === 'instagram' ? `https://www.instagram.com/${handle[1]}` : `https://www.tiktok.com/@${handle[1]}`
  }
  if (/^http:\/\//i.test(v)) v = v.replace(/^http:\/\//i, 'https://')
  if (!/^https:\/\//i.test(v)) v = `https://${v}`
  v = v.replace(/^https:\/\//i, 'https://')
  // Tira rastreadores (?igsh=…, ?utm_…) dos links das redes; site fica como está.
  if (network !== 'site' && network !== 'facebook') v = v.replace(/[?#].*$/, '')
  if (network !== 'site') {
    // Domínio em minúsculas e com www para as redes que exigem
    v = v.replace(/^https:\/\/([^/]+)/, (_m, host: string) => `https://${host.toLowerCase()}`)
    if (network === 'instagram' || network === 'tiktok' || network === 'youtube') {
      v = v.replace(/^https:\/\/(?:www\.)?/, 'https://www.')
    }
  }
  if (v.length > 200 || /[\s<>"'\\]/.test(v) || !SOCIAL_PATTERN[network].test(v)) return null
  return v
}

/** Valida e normaliza todas as redes do formulário. */
export function cleanSocialLinks(values: Partial<Record<SocialNetwork, string>>): {
  links: SocialLinks
  errors: Partial<Record<SocialNetwork, string>>
} {
  const links: SocialLinks = {}
  const errors: Partial<Record<SocialNetwork, string>> = {}
  for (const { key } of SOCIAL_NETWORKS) {
    const url = normalizeSocial(key, values[key] ?? '')
    if (url === null) errors[key] = SOCIAL_ERROR[key]
    else if (url) links[key] = url
  }
  return { links, errors }
}

/** Texto curto para mostrar no botão ("@ana.nutri", "seusite.com.br"). */
export function socialDisplay(network: SocialNetwork, url: string): string {
  const path = url.replace(/^https:\/\/(www\.|m\.)?/, '')
  if (network === 'instagram') return `@${path.replace(/^instagram\.com\//, '').replace(/\/$/, '')}`
  if (network === 'tiktok') return path.replace(/^tiktok\.com\//, '').replace(/\/$/, '')
  return path.replace(/\/$/, '')
}

// ---------------------------------------------------------------------------
// Vídeos de fora (YouTube, Google Drive e Vimeo)
// ---------------------------------------------------------------------------

export interface VideoRef {
  provider: MediaProvider
  id: string
}

/** Entende um link de vídeo do YouTube, Google Drive ou Vimeo. Outros: null. */
export function parseVideoLink(raw: string): VideoRef | null {
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`)
  } catch {
    return null
  }
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, '')
  const parts = url.pathname.split('/').filter(Boolean)

  if (host === 'youtu.be' || host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'music.youtube.com') {
    const id =
      host === 'youtu.be'
        ? parts[0]
        : parts[0] === 'watch'
          ? url.searchParams.get('v')
          : ['shorts', 'embed', 'live', 'v'].includes(parts[0])
            ? parts[1]
            : null
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? { provider: 'youtube', id } : null
  }
  if (host === 'drive.google.com') {
    const id = parts[0] === 'file' && parts[1] === 'd' ? parts[2] : url.searchParams.get('id')
    return id && /^[A-Za-z0-9_-]{10,100}$/.test(id) ? { provider: 'drive', id } : null
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = [...parts].reverse().find((p) => /^[0-9]{6,12}$/.test(p))
    return id ? { provider: 'vimeo', id } : null
  }
  return null
}

/** Endereço do player oficial (montado aqui, nunca guardado como link solto). */
export function embedUrl({ provider, id }: VideoRef): string {
  if (provider === 'youtube') return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`
  if (provider === 'drive') return `https://drive.google.com/file/d/${id}/preview`
  return `https://player.vimeo.com/video/${id}?autoplay=1&dnt=1`
}

/** Link para abrir o vídeo no site de origem. */
export function watchUrl({ provider, id }: VideoRef): string {
  if (provider === 'youtube') return `https://www.youtube.com/watch?v=${id}`
  if (provider === 'drive') return `https://drive.google.com/file/d/${id}/view`
  return `https://vimeo.com/${id}`
}

/** Miniatura pública do vídeo (só o YouTube oferece sem login). */
export function videoThumbnail({ provider, id }: VideoRef): string | null {
  return provider === 'youtube' ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null
}

export const PROVIDER_LABEL: Record<MediaProvider, string> = {
  youtube: 'YouTube',
  drive: 'Google Drive',
  vimeo: 'Vimeo',
}

// ---------------------------------------------------------------------------
// Formação, experiência e idade
// ---------------------------------------------------------------------------

/** O profissional preencheu alguma coisa de formação ou experiência? */
export function hasExperience(p: {
  education?: string | null
  years_experience?: number | null
  birth_year?: number | null
  experiences?: string[] | null
}): boolean {
  return Boolean(p.education || p.years_experience != null || p.birth_year != null || p.experiences?.length)
}

/** Idade a partir do ano de nascimento (pode errar por 1 antes do aniversário). */
export function ageFrom(birthYear: number | null | undefined, now = new Date()): number | null {
  if (birthYear == null) return null
  const age = now.getFullYear() - birthYear
  return age >= 16 && age <= 110 ? age : null
}

export function yearsLabel(years: number): string {
  if (years === 0) return 'Menos de 1 ano na área'
  return years === 1 ? '1 ano na área' : `${years} anos na área`
}

/** Adiciona uma experiência sem repetir e respeitando os limites. */
export function addExperience(list: string[], raw: string): string[] {
  const item = raw.replace(/\s+/g, ' ').trim().slice(0, EXPERIENCE_MAX_LEN)
  if (item.length < 2 || list.length >= EXPERIENCES_MAX) return list
  if (list.some((e) => e.toLowerCase() === item.toLowerCase())) return list
  return [...list, item]
}

/** Número inteiro digitado num campo, ou null se vazio. NaN se não for número. */
export function parseWholeNumber(raw: string): number | null {
  const v = raw.trim()
  if (!v) return null
  return /^\d{1,4}$/.test(v) ? Number(v) : Number.NaN
}

export interface ShowcaseValues {
  education: string
  yearsExperience: string
  birthYear: string
  experiences: string[]
  social: Partial<Record<SocialNetwork, string>>
}

export type ShowcaseErrors = Partial<Record<'education' | 'yearsExperience' | 'birthYear' | SocialNetwork, string>>

export function validateShowcase(v: ShowcaseValues, now = new Date()): ShowcaseErrors {
  const e: ShowcaseErrors = {}
  if (v.education.trim().length > EDUCATION_MAX) e.education = `Use no máximo ${EDUCATION_MAX} caracteres.`
  const years = parseWholeNumber(v.yearsExperience)
  if (years !== null && (Number.isNaN(years) || years > YEARS_MAX)) {
    e.yearsExperience = `Informe um número de 0 a ${YEARS_MAX}.`
  }
  const birth = parseWholeNumber(v.birthYear)
  const maxYear = Math.min(BIRTH_YEAR_MAX, now.getFullYear() - 16)
  if (birth !== null && (Number.isNaN(birth) || birth < BIRTH_YEAR_MIN || birth > maxYear)) {
    e.birthYear = `Informe o ano com 4 dígitos (entre ${BIRTH_YEAR_MIN} e ${maxYear}).`
  }
  return { ...e, ...cleanSocialLinks(v.social).errors }
}

/** Colunas prontas para gravar em `professionals`. */
export function toShowcaseRow(v: ShowcaseValues) {
  return {
    education: v.education.trim(),
    years_experience: parseWholeNumber(v.yearsExperience),
    birth_year: parseWholeNumber(v.birthYear),
    experiences: v.experiences,
    social_links: cleanSocialLinks(v.social).links,
  }
}

export function initialShowcase(p?: {
  education?: string | null
  years_experience?: number | null
  birth_year?: number | null
  experiences?: string[] | null
  social_links?: SocialLinks | null
}): ShowcaseValues {
  return {
    education: p?.education ?? '',
    yearsExperience: p?.years_experience != null ? String(p.years_experience) : '',
    birthYear: p?.birth_year != null ? String(p.birth_year) : '',
    experiences: p?.experiences ?? [],
    social: { ...(p?.social_links ?? {}) },
  }
}

// ---------------------------------------------------------------------------
// Avaliações
// ---------------------------------------------------------------------------

/** Psicólogos não recebem avaliações públicas (regras do CFP). */
export function acceptsReviews(specialty: string): boolean {
  return specialty !== 'psicologo'
}

/** Quantas avaliações de cada nota (índice 0 = 5 estrelas … 4 = 1 estrela). */
export function ratingBreakdown(ratings: number[]): { stars: number; count: number; share: number }[] {
  return [5, 4, 3, 2, 1].map((stars) => {
    const count = ratings.filter((r) => r === stars).length
    return { stars, count, share: ratings.length ? count / ratings.length : 0 }
  })
}

export function reviewsLabel(count: number): string {
  return count === 1 ? '1 avaliação' : `${count} avaliações`
}

/** "há 3 dias", "há 2 meses" */
export function timeAgo(iso: string, now = new Date()): string {
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000)
  if (days < 1) return 'hoje'
  if (days === 1) return 'ontem'
  if (days < 30) return `há ${days} dias`
  const months = Math.floor(days / 30)
  if (months < 12) return months === 1 ? 'há 1 mês' : `há ${months} meses`
  const years = Math.floor(days / 365)
  return years <= 1 ? 'há 1 ano' : `há ${years} anos`
}

/** Mensagem amigável para os erros do banco ao mexer na vitrine. */
export function showcaseErrorMessage(message: string): string {
  if (/demonstra/i.test(message)) return message
  if (/row-level security/i.test(message) && /professional_media|objects/i.test(message)) {
    return 'Contas de demonstração não enviam fotos nem vídeos. Crie uma conta para montar sua galeria.'
  }
  if (/row-level security/i.test(message) && /professional_reviews/i.test(message)) {
    return 'Só quem já compartilhou a rotina com este profissional pode avaliar.'
  }
  if (/máximo 12/i.test(message)) return message
  if (/exceeded|too large|maximum allowed size/i.test(message)) return 'O arquivo passou de 50 MB. Envie um vídeo mais curto.'
  if (/mime|not supported|invalid_mime/i.test(message)) return 'Esse tipo de arquivo não é aceito. Use JPG, MP4, MOV ou WebM.'
  return message
}
