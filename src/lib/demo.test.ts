import { describe, expect, it } from 'vitest'
import { DEMO_ACCOUNTS, DEMO_TEAM_PROS } from './demo'

describe('contas demo', () => {
  const all = [...Object.values(DEMO_ACCOUNTS), ...DEMO_TEAM_PROS]
  it('cada botão entra numa conta diferente', () => {
    expect(new Set(all.map((a) => a.email)).size).toBe(all.length)
  })
  it('todas são contas demo do domínio do app, com a mesma senha pública', () => {
    for (const a of all) {
      expect(a.email).toMatch(/^demo\.[a-z0-9.]+@skyro\.app$/)
      expect(a.password).toBe('skyro-demo-2026')
    }
  })
  it('a equipe do Lucas usa os e-mails que o seed 02 cria com senha (1, 3 e 8)', () => {
    expect(DEMO_TEAM_PROS.map((a) => a.email).sort()).toEqual([
      'demo.catalogo.1@skyro.app',
      'demo.catalogo.3@skyro.app',
      'demo.catalogo.8@skyro.app',
    ])
  })
})
