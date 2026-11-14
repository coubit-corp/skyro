import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="text-sm text-muted">O endereço pode ter mudado ou não existe.</p>
      <Link to="/" className="btn-primary">Voltar ao início</Link>
    </div>
  )
}
