import { Component, type ReactNode } from 'react'
import { isStaleChunkError, reloadForNewVersion } from '../lib/staleVersion'

/** Em vez de tela branca, mostra um aviso com botão para recarregar. */
export class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    if (isStaleChunkError(error)) reloadForNewVersion()
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="card max-w-sm space-y-3 text-center">
          <p className="font-semibold">Algo deu errado ao abrir esta tela.</p>
          <p className="text-sm text-muted">
            Pode ser uma versão nova do app que acabou de sair. Recarregar costuma resolver.
          </p>
          <button className="btn-primary w-full" onClick={() => window.location.reload()}>
            Recarregar
          </button>
        </div>
      </div>
    )
  }
}
