import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { reloadForNewVersion } from './lib/staleVersion'
import './index.css'
import { applyTheme, readThemePref, watchSystemTheme } from './lib/theme'

// O index.html já aplicou o tema antes de carregar; aqui só confirma e acompanha o sistema.
applyTheme(readThemePref())
watchSystemTheme()

// Uma versão nova foi publicada com a aba aberta: os arquivos antigos sumiram, então recarrega para pegar os novos
window.addEventListener('vite:preloadError', (event) => {
  if (reloadForNewVersion()) event.preventDefault()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)
