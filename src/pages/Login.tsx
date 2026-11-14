import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import { homeFor } from '../auth/home'
import { Logo } from '../components/Logo'
import type { Role } from '../lib/database.types'
import { DEMO_ACCOUNTS } from '../lib/demo'
import { supabase } from '../lib/supabase'

type Mode = 'entrar' | 'cadastrar'

/** Traduz as mensagens mais comuns do Supabase Auth. */
function friendlyError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'E-mail ou senha incorretos.'
  if (/already registered/i.test(message)) return 'Este e-mail já tem cadastro. Tente entrar.'
  if (/password should be at least/i.test(message)) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (/email not confirmed/i.test(message)) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.'
  if (/failed to fetch|network/i.test(message)) return 'Sem conexão com o servidor. Verifique sua internet.'
  return message
}

export function Login() {
  const { session, profile } = useAuth()
  const [mode, setMode] = useState<Mode>('entrar')
  const [role, setRole] = useState<Role>('person')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  if (session && profile) return <Navigate to={homeFor(profile.role)} replace />

  async function signIn(mail: string, pass: string) {
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: mail, password: pass })
    if (error) setError(friendlyError(error.message))
    setBusy(false)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setInfo(null)
    if (mode === 'entrar') return signIn(email.trim(), password)

    setBusy(true)
    setError(null)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim(), role } },
    })
    if (error) setError(friendlyError(error.message))
    else if (!data.session) setInfo('Conta criada! Enviamos um link de confirmação para o seu e-mail.')
    setBusy(false)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <header className="space-y-3 text-center">
          <Logo size="lg" />
          <p className="text-sm text-muted">
            Seu nutricionista, psicólogo ou personal acompanhando sua rotina de verdade, não só no dia da consulta.
          </p>
        </header>

        <div className="grid grid-cols-2 rounded-2xl bg-lavender-soft p-1" role="tablist">
          {(['entrar', 'cadastrar'] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m)
                setError(null)
                setInfo(null)
              }}
              className={`rounded-xl py-2 text-sm font-semibold transition ${
                mode === m ? 'bg-card text-ink shadow-sm' : 'text-muted'
              }`}
            >
              {m === 'entrar' ? 'Entrar' : 'Criar conta'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'cadastrar' && (
            <>
              <fieldset className="grid grid-cols-2 gap-2">
                <legend className="eyebrow mb-2">Eu sou</legend>
                {(
                  [
                    ['person', 'Pessoa'],
                    ['professional', 'Profissional'],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className={`cursor-pointer rounded-2xl border px-4 py-3 text-center text-sm font-semibold transition ${
                      role === value ? 'border-primary bg-lavender-soft text-primary' : 'border-line bg-card text-muted'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={value}
                      checked={role === value}
                      onChange={() => setRole(value)}
                      className="sr-only"
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
              <input
                className="input"
                placeholder="Seu nome"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </>
          )}
          <input
            className="input"
            type="email"
            placeholder="E-mail"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder="Senha"
            autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'}
            minLength={6}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <p role="alert" className="rounded-xl bg-attention-soft px-3 py-2 text-sm text-attention">
              {error}
            </p>
          )}
          {info && <p className="rounded-xl bg-lavender-soft px-3 py-2 text-sm text-primary">{info}</p>}

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? 'Aguarde…' : mode === 'entrar' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <div className="space-y-2">
          <p className="eyebrow text-center">Só quer conhecer?</p>
          {Object.values(DEMO_ACCOUNTS).map((acc) => (
            <button
              key={acc.email}
              className="btn-outline w-full"
              disabled={busy}
              onClick={() => signIn(acc.email, acc.password)}
            >
              {acc.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
