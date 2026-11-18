import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { applyTheme, readThemePref, watchSystemTheme } from './lib/theme'

// O index.html já aplicou o tema antes de carregar; aqui só confirma e acompanha o sistema.
applyTheme(readThemePref())
watchSystemTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
