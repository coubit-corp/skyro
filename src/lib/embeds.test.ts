// Guarda contra a volta do erro "more than one relationship was found for
// 'professionals' and 'profiles'": toda consulta que traz o perfil a partir de
// um profissional precisa usar PRO_PROFILE (com a ligação indicada).
import { describe, expect, it } from 'vitest'
import { PRO_PROFILE } from './supabase'

const HOOKS = import.meta.glob<string>('../hooks/*.ts', { query: '?raw', import: 'default', eager: true })

describe('consultas ao Supabase', () => {
  it('PRO_PROFILE indica a ligação professionals → profiles', () => {
    expect(PRO_PROFILE).toMatch(/^profiles!professionals_id_fkey\(/)
  })
  it('nenhum hook traz o perfil de um profissional sem indicar a ligação', () => {
    expect(Object.keys(HOOKS).length).toBeGreaterThanOrEqual(4)
    for (const [file, src] of Object.entries(HOOKS)) {
      // "professionals(... profiles(" sem o "!" é exatamente o caso que quebra
      expect(src, file).not.toMatch(/professionals\([^)]*\bprofiles\(/)
      // .from('professionals').select('*, profiles(...)')
      for (const m of src.matchAll(/from\('professionals'\)\s*\.select\(([^)]*\))/g)) {
        expect(m[1], file).not.toMatch(/\bprofiles\(/)
      }
    }
  })
})
