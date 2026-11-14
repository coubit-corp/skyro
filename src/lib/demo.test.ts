import { describe, expect, it } from 'vitest'
import { DEMO_ACCOUNTS } from './demo'

describe('contas demo', () => {
  const all = Object.values(DEMO_ACCOUNTS)
  it('cada botão entra numa conta diferente', () => {
    expect(new Set(all.map((a) => a.email)).size).toBe(all.length)
  })
  it('todas são contas demo do domínio do app, com a mesma senha pública', () => {
    for (const a of all) {
      expect(a.email).toMatch(/^demo\.[a-z0-9.]+@skyro\.app$/)
      expect(a.password).toBe('skyro-demo-2026')
    }
  })
  it('o login mostra só três botões: pessoa, profissional e equipe', () => {
    expect(Object.keys(DEMO_ACCOUNTS)).toEqual(['person', 'professional', 'team'])
  })
})
