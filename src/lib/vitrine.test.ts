import { describe, expect, it } from 'vitest'
import {
  acceptsReviews,
  addExperience,
  ageFrom,
  cleanSocialLinks,
  embedUrl,
  normalizeSocial,
  parseVideoLink,
  ratingBreakdown,
  socialDisplay,
  timeAgo,
  toShowcaseRow,
  validateShowcase,
  videoThumbnail,
  yearsLabel,
  type ShowcaseValues,
} from './vitrine'

describe('normalizeSocial', () => {
  it('aceita @ no Instagram e no TikTok', () => {
    expect(normalizeSocial('instagram', '@ana.nutri')).toBe('https://www.instagram.com/ana.nutri')
    expect(normalizeSocial('instagram', 'ana.nutri')).toBe('https://www.instagram.com/ana.nutri')
    expect(normalizeSocial('tiktok', '@ana_treina')).toBe('https://www.tiktok.com/@ana_treina')
  })
  it('completa https e www, e tira rastreadores', () => {
    expect(normalizeSocial('instagram', 'instagram.com/ana.nutri/?igsh=abc123')).toBe('https://www.instagram.com/ana.nutri/')
    expect(normalizeSocial('instagram', 'HTTP://Instagram.com/ana')).toBe('https://www.instagram.com/ana')
    expect(normalizeSocial('youtube', 'youtube.com/@canaldaana')).toBe('https://www.youtube.com/@canaldaana')
    expect(normalizeSocial('linkedin', 'br.linkedin.com/in/ana-lima')).toBe('https://br.linkedin.com/in/ana-lima')
    expect(normalizeSocial('facebook', 'facebook.com/profile.php?id=123')).toBe('https://facebook.com/profile.php?id=123')
    expect(normalizeSocial('site', 'anaLima.com.br/sobre')).toBe('https://anaLima.com.br/sobre')
  })
  it('vazio quer dizer sem a rede', () => {
    expect(normalizeSocial('site', '   ')).toBe('')
  })
  it('recusa links de outro site ou perigosos', () => {
    expect(normalizeSocial('instagram', 'https://evil.com/instagram.com/x')).toBeNull()
    expect(normalizeSocial('instagram', 'https://instagram.com.evil.com/x')).toBeNull()
    expect(normalizeSocial('site', 'javascript:alert(1)')).toBeNull()
    expect(normalizeSocial('site', 'site sem ponto')).toBeNull()
    expect(normalizeSocial('linkedin', 'linkedin.com/feed')).toBeNull()
    expect(normalizeSocial('facebook', 'facebook.com')).toBeNull()
  })
  it('cleanSocialLinks junta os válidos e aponta os erros', () => {
    const { links, errors } = cleanSocialLinks({ instagram: '@ana', facebook: 'nao é link', site: '' })
    expect(links).toEqual({ instagram: 'https://www.instagram.com/ana' })
    expect(Object.keys(errors)).toEqual(['facebook'])
  })
  it('socialDisplay mostra um texto curto', () => {
    expect(socialDisplay('instagram', 'https://www.instagram.com/ana.nutri/')).toBe('@ana.nutri')
    expect(socialDisplay('tiktok', 'https://www.tiktok.com/@ana')).toBe('@ana')
    expect(socialDisplay('site', 'https://ana.com.br/')).toBe('ana.com.br')
  })
})

describe('parseVideoLink', () => {
  it('entende os formatos do YouTube', () => {
    for (const url of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s',
      'youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ?si=abc',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    ]) {
      expect(parseVideoLink(url), url).toEqual({ provider: 'youtube', id: 'dQw4w9WgXcQ' })
    }
  })
  it('entende Google Drive e Vimeo', () => {
    expect(parseVideoLink('https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUv/view?usp=sharing')).toEqual({
      provider: 'drive',
      id: '1AbCdEfGhIjKlMnOpQrStUv',
    })
    expect(parseVideoLink('https://drive.google.com/open?id=1AbCdEfGhIjKlMnOpQrStUv')?.provider).toBe('drive')
    expect(parseVideoLink('https://vimeo.com/123456789')).toEqual({ provider: 'vimeo', id: '123456789' })
    expect(parseVideoLink('https://vimeo.com/channels/staffpicks/123456789')?.id).toBe('123456789')
  })
  it('recusa o resto', () => {
    expect(parseVideoLink('https://evil.com/watch?v=dQw4w9WgXcQ')).toBeNull()
    expect(parseVideoLink('https://www.youtube.com/@canal')).toBeNull()
    expect(parseVideoLink('https://www.youtube.com/watch?v=curto')).toBeNull()
    expect(parseVideoLink('não é link')).toBeNull()
  })
  it('monta o player oficial e a miniatura', () => {
    expect(embedUrl({ provider: 'youtube', id: 'dQw4w9WgXcQ' })).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/)
    expect(embedUrl({ provider: 'drive', id: 'abcdefghijk' })).toBe('https://drive.google.com/file/d/abcdefghijk/preview')
    expect(videoThumbnail({ provider: 'youtube', id: 'dQw4w9WgXcQ' })).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
    expect(videoThumbnail({ provider: 'vimeo', id: '123456' })).toBeNull()
  })
})

describe('formação, experiência e idade', () => {
  const now = new Date('2026-11-18T12:00:00')
  it('ageFrom', () => {
    expect(ageFrom(1990, now)).toBe(36)
    expect(ageFrom(null, now)).toBeNull()
    expect(ageFrom(2020, now)).toBeNull()
  })
  it('yearsLabel', () => {
    expect(yearsLabel(0)).toBe('Menos de 1 ano na área')
    expect(yearsLabel(1)).toBe('1 ano na área')
    expect(yearsLabel(12)).toBe('12 anos na área')
  })
  it('addExperience não repete e respeita o limite', () => {
    expect(addExperience(['Clínica'], '  clínica ')).toEqual(['Clínica'])
    expect(addExperience([], 'Academia   X')).toEqual(['Academia X'])
    expect(addExperience(Array.from({ length: 8 }, (_, i) => `item ${i}`), 'mais um')).toHaveLength(8)
  })
  const base: ShowcaseValues = { education: '', yearsExperience: '', birthYear: '', experiences: [], social: {} }
  it('validateShowcase aceita tudo vazio', () => {
    expect(validateShowcase(base, now)).toEqual({})
  })
  it('validateShowcase aponta números fora do lugar', () => {
    const e = validateShowcase({ ...base, yearsExperience: '80', birthYear: '90', social: { site: 'x' } }, now)
    expect(Object.keys(e).sort()).toEqual(['birthYear', 'site', 'yearsExperience'])
    expect(validateShowcase({ ...base, yearsExperience: 'dez' }, now).yearsExperience).toBeTruthy()
  })
  it('toShowcaseRow', () => {
    expect(
      toShowcaseRow({ ...base, education: ' USP ', yearsExperience: '8', birthYear: '', social: { instagram: '@ana' } }),
    ).toEqual({
      education: 'USP',
      years_experience: 8,
      birth_year: null,
      experiences: [],
      social_links: { instagram: 'https://www.instagram.com/ana' },
    })
  })
})

describe('avaliações', () => {
  it('psicólogos não recebem avaliações públicas', () => {
    expect(acceptsReviews('psicologo')).toBe(false)
    expect(acceptsReviews('personal')).toBe(true)
  })
  it('ratingBreakdown', () => {
    const b = ratingBreakdown([5, 5, 4, 1])
    expect(b.map((x) => x.count)).toEqual([2, 1, 0, 0, 1])
    expect(b[0].share).toBe(0.5)
    expect(ratingBreakdown([])[0].share).toBe(0)
  })
  it('timeAgo', () => {
    const now = new Date('2026-11-18T12:00:00Z')
    expect(timeAgo('2026-11-18T08:00:00Z', now)).toBe('hoje')
    expect(timeAgo('2026-11-17T08:00:00Z', now)).toBe('ontem')
    expect(timeAgo('2026-11-08T12:00:00Z', now)).toBe('há 10 dias')
    expect(timeAgo('2026-08-18T12:00:00Z', now)).toBe('há 3 meses')
    expect(timeAgo('2024-08-18T12:00:00Z', now)).toBe('há 2 anos')
  })
})
