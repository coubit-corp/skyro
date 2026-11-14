// Traços do avatar ilustrado, sorteados de forma estável a partir de uma semente:
// a mesma pessoa sempre tem o mesmo rosto, sem foto e sem serviço externo.

export const SKIN = ['#f5d0b5', '#e8b48f', '#c98c64', '#9c6644', '#6f4a33'] as const
export const HAIR = ['#2b1d16', '#4a2f1f', '#8a5a33', '#d4a24c', '#1c2a4d'] as const
export const SHIRT = ['#4c63b6', '#1c2a4d', '#8ea2e6', '#2f7a55', '#b4532a'] as const
export const HAIR_STYLES = ['curto', 'longo', 'coque', 'cacheado', 'raspado'] as const

export type HairStyle = (typeof HAIR_STYLES)[number]

export interface AvatarTraits {
  skin: string
  hair: string
  shirt: string
  hairStyle: HairStyle
}

/** Hash simples e estável (FNV-1a) para transformar texto em número. */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function avatarTraits(seed: string): AvatarTraits {
  const h = hashSeed(seed || '?')
  return {
    skin: SKIN[h % SKIN.length],
    hair: HAIR[(h >>> 3) % HAIR.length],
    shirt: SHIRT[(h >>> 6) % SHIRT.length],
    hairStyle: HAIR_STYLES[(h >>> 9) % HAIR_STYLES.length],
  }
}
