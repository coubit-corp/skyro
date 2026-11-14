/** Mostrado quando o .env não foi criado: evita uma tela branca sem explicação. */
export function ConfigMissing() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 px-4">
      <h1 className="text-xl font-bold">Falta configurar o Supabase</h1>
      <p className="text-sm text-muted">
        Copie o arquivo <code>.env.example</code> para <code>.env</code>, preencha <code>VITE_SUPABASE_URL</code> e{' '}
        <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> e reinicie o <code>npm run dev</code>.
      </p>
    </div>
  )
}
