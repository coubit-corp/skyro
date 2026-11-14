import { describe, expect, it } from 'vitest'
import { isNavActive, type NavMatch } from './nav'

const PRO: NavMatch[] = [
  { to: '/pro', end: true, alsoActiveOn: ['/pro/pacientes'] },
  { to: '/pro/agenda' },
  { to: '/pro/mensagens' },
  { to: '/pro/perfil' },
]
const active = (items: NavMatch[], path: string) => items.filter((i) => isNavActive(path, i)).map((i) => i.to)

describe('aba ativa do menu', () => {
  it('no painel do profissional, só uma aba fica ativa por tela', () => {
    expect(active(PRO, '/pro')).toEqual(['/pro'])
    expect(active(PRO, '/pro/pacientes/abc')).toEqual(['/pro'])
    expect(active(PRO, '/pro/perfil')).toEqual(['/pro/perfil'])
    expect(active(PRO, '/pro/agenda')).toEqual(['/pro/agenda'])
    expect(active(PRO, '/pro/mensagens')).toEqual(['/pro/mensagens'])
  })
  it('sem "end", vale também para as subpáginas', () => {
    expect(isNavActive('/saude/perto', { to: '/saude' })).toBe(true)
    expect(isNavActive('/saude/profissional/1', { to: '/saude' })).toBe(true)
  })
  it('não confunde caminhos que só começam com as mesmas letras', () => {
    expect(isNavActive('/saudeextra', { to: '/saude' })).toBe(false)
    expect(isNavActive('/pro/pacientesx', { to: '/pro', end: true, alsoActiveOn: ['/pro/pacientes'] })).toBe(false)
  })
  it('ignora a barra no fim do endereço', () => {
    expect(isNavActive('/pro/', { to: '/pro', end: true })).toBe(true)
    expect(isNavActive('/equipe/', { to: '/equipe', end: true })).toBe(true)
  })
  it('na área da equipe, Pendentes não fica ativo em Decididos', () => {
    const TEAM: NavMatch[] = [{ to: '/equipe', end: true }, { to: '/equipe/decididos' }]
    expect(active(TEAM, '/equipe')).toEqual(['/equipe'])
    expect(active(TEAM, '/equipe/decididos')).toEqual(['/equipe/decididos'])
  })
})
