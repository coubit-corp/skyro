// Tema claro ou escuro. A escolha fica salva no próprio aparelho (localStorage):
// é uma preferência de tela, não um dado de saúde, e não precisa ir para o banco.
// O index.html aplica o tema antes de o app carregar, para a tela não piscar.

export type ThemePref = 'claro' | 'escuro' | 'sistema'
export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'skyro-tema'
export const DEFAULT_THEME_PREF: ThemePref = 'claro'

export const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'claro', label: 'Claro' },
  { value: 'escuro', label: 'Escuro' },
  { value: 'sistema', label: 'Automático' },
]

/** Cor da barra do navegador no celular, para combinar com o fundo. */
const BROWSER_BAR: Record<Theme, string> = { light: '#1C2A4D', dark: '#0E1424' }

export function parseThemePref(value: string | null | undefined): ThemePref {
  return value === 'claro' || value === 'escuro' || value === 'sistema' ? value : DEFAULT_THEME_PREF
}

export function resolveTheme(pref: ThemePref, systemDark: boolean): Theme {
  if (pref === 'sistema') return systemDark ? 'dark' : 'light'
  return pref === 'escuro' ? 'dark' : 'light'
}

export function readThemePref(): ThemePref {
  try {
    return parseThemePref(localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return DEFAULT_THEME_PREF // navegação privada ou armazenamento bloqueado
  }
}

function systemPrefersDark(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
}

export function applyTheme(pref: ThemePref): Theme {
  const theme = resolveTheme(pref, systemPrefersDark())
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BROWSER_BAR[theme])
  return theme
}

export function saveThemePref(pref: ThemePref): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref)
  } catch {
    // sem armazenamento: o tema vale só até fechar a aba
  }
  applyTheme(pref)
}

/** No modo automático, acompanha quando o sistema troca entre claro e escuro. */
export function watchSystemTheme(): () => void {
  if (typeof matchMedia !== 'function') return () => {}
  const media = matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => {
    if (readThemePref() === 'sistema') applyTheme('sistema')
  }
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}
