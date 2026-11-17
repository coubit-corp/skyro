import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME_PREF, parseThemePref, resolveTheme } from './theme'

describe('parseThemePref', () => {
  it('aceita as três opções', () => {
    expect(parseThemePref('claro')).toBe('claro')
    expect(parseThemePref('escuro')).toBe('escuro')
    expect(parseThemePref('sistema')).toBe('sistema')
  })

  it('volta para o padrão com valor vazio ou estranho', () => {
    expect(parseThemePref(null)).toBe(DEFAULT_THEME_PREF)
    expect(parseThemePref('dark')).toBe(DEFAULT_THEME_PREF)
  })
})

describe('resolveTheme', () => {
  it('claro e escuro ignoram o sistema', () => {
    expect(resolveTheme('claro', true)).toBe('light')
    expect(resolveTheme('escuro', false)).toBe('dark')
  })

  it('automático segue o sistema', () => {
    expect(resolveTheme('sistema', true)).toBe('dark')
    expect(resolveTheme('sistema', false)).toBe('light')
  })
})
