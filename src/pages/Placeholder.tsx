import type { ReactNode } from 'react'
import { DemoBanner } from '../components/DemoBanner'

/** Tela provisória: marca a rota e o que vai ser construído nela. */
export function Placeholder({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </header>
      <div className="card border border-dashed border-lavender text-sm text-muted">
        Em construção: esta tela chega numa próxima etapa do MVP.
      </div>
      {children}
      <DemoBanner />
    </section>
  )
}
