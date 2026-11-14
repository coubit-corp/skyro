import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/auth-context'
import { Avatar } from '../../components/Avatar'
import { DemoBanner } from '../../components/DemoBanner'
import { Logo } from '../../components/Logo'
import { SignOutButton } from '../../components/SignOutButton'
import { ErrorState, Skeleton } from '../../components/ui'
import { useMyProfessional, usePatients, type PatientRow } from '../../hooks/useProData'
import { formatHours } from '../../lib/dates'
import { specialtyLabel } from '../../lib/specialties'

/** Frase curta de cada paciente: o motivo do alerta ou como ele está. */
function summaryLine(p: PatientRow): string {
  const e = p.evaluation
  if (e.alerts.length) return e.alerts.map((a) => a.message).join(' · ')
  const parts: string[] = []
  if (e.workoutsPlanned) parts.push(`Treinos ${e.workoutsDone}/${e.workoutsPlanned}`)
  if (e.lastSleep != null) parts.push(`${formatHours(e.lastSleep)} de sono`)
  if (p.streak >= 7) parts.push(`Strike de ${p.streak} dias`)
  return parts.join(' · ') || 'Em dia'
}

export function Pacientes() {
  const { profile } = useAuth()
  const me = useMyProfessional()
  const patients = usePatients()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (patients.data ?? []).filter((p) => !q || p.name.toLowerCase().includes(q))
  }, [patients.data, query])
  const attention = (patients.data ?? []).filter((p) => p.evaluation.status === 'atencao').length

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between lg:hidden">
        <span className="flex items-center gap-2">
          <Logo />
          <span className="rounded-md bg-navy px-1.5 py-0.5 text-[10px] font-bold text-white">PRO</span>
        </span>
        <SignOutButton />
      </header>

      <div>
        <h1 className="text-[28px] font-bold">Seus pacientes</h1>
        <p className="text-sm text-muted">
          {me.data ? specialtyLabel(me.data.specialty) : profile?.full_name}
          {patients.data && ` · ${patients.data.length} ${patients.data.length === 1 ? 'paciente ativo' : 'pacientes ativos'}`}
        </p>
      </div>
      <label className="relative block">
        <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          className="input pl-10"
          placeholder="Buscar paciente"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar paciente"
        />
      </label>

      {patients.isLoading ? (
        <Skeleton className="h-20" />
      ) : (
        patients.data!.length > 0 && (
          <div className="flex items-center gap-4 rounded-card bg-navy px-5 py-4 text-white">
            <span className="font-display text-4xl font-extrabold text-lavender">{attention}</span>
            <div>
              <p className="font-semibold">
                {attention === 0
                  ? 'Todos os pacientes estão em dia'
                  : attention === 1
                    ? 'paciente precisa de atenção hoje'
                    : 'pacientes precisam de atenção hoje'}
              </p>
              <p className="text-xs text-white/70">sono curto, treinos perdidos, pouca água ou sem registro</p>
            </div>
          </div>
        )
      )}

      <h2 className="eyebrow pt-2">Atualizados hoje</h2>

      {patients.error ? (
        <ErrorState message={patients.error.message} onRetry={() => patients.refetch()} />
      ) : patients.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : patients.data!.length === 0 ? (
        <div className="card text-sm text-muted">
          Nenhum paciente compartilhou a rotina com você ainda. Quando alguém tocar em "Compartilhar minha rotina" no seu
          perfil, ele aparece aqui.
        </div>
      ) : filtered.length === 0 ? (
        <p className="card text-sm text-muted">Nenhum paciente com esse nome.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((p) => {
            const attn = p.evaluation.status === 'atencao'
            return (
              <li key={p.id} className="min-w-0">
                <Link
                  to={`/pro/pacientes/${p.id}`}
                  className="card flex items-center gap-3 transition hover:ring-2 hover:ring-lavender"
                >
                  <Avatar seed={p.avatarSeed} photo={p.avatarPath} name={p.name} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{p.name}</p>
                    <p className="truncate text-sm text-muted">{summaryLine(p)}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                      attn ? 'bg-attention-soft text-attention' : 'bg-chip text-muted'
                    }`}
                  >
                    {attn ? 'Atenção' : 'Em dia'}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <DemoBanner />
    </section>
  )
}
