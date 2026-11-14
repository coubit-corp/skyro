import { describe, expect, it } from 'vitest'
import { avatarTraits, HAIR_STYLES } from './avatar'

describe('avatarTraits', () => {
  it('é estável: a mesma semente gera sempre o mesmo avatar', () => {
    expect(avatarTraits('ana-lima')).toEqual(avatarTraits('ana-lima'))
  })
  it('varia entre pessoas (os 20 nomes da demo não ficam todos iguais)', () => {
    const names = ['lucas-martins', 'ana-lima', 'beatriz-santos', 'rafael-ferreira', 'camila-andrade', 'gustavo-pereira',
      'júlia-nogueira', 'carlos-souza', 'júlia-ramos', 'pedro-alves', 'marina-costa', 'rafael-nunes', 'beatriz-lopes',
      'thiago-moreira', 'fernanda-dias', 'gustavo-prado', 'larissa-teixeira', 'bruno-carvalho', 'camila-ferreira', 'x']
    const styles = new Set(names.map((n) => avatarTraits(n).hairStyle))
    const skins = new Set(names.map((n) => avatarTraits(n).skin))
    expect(styles.size).toBeGreaterThanOrEqual(3)
    expect(skins.size).toBeGreaterThanOrEqual(3)
    expect(HAIR_STYLES).toContain(avatarTraits('qualquer').hairStyle)
  })
  it('aguenta semente vazia', () => {
    expect(avatarTraits('').skin).toBeTruthy()
  })
})
