export function FullScreenLoader({ message = 'Carregando…' }: { message?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 text-muted" role="status">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-lavender-soft border-t-primary" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
