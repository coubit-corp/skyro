import { MapPin } from 'lucide-react'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DemoBanner } from '../../components/DemoBanner'
import { ProCard } from '../../components/ProCard'
import { ProMap } from '../../components/ProMap'
import { ChipTabs, ErrorState, PageHeader, SectionTitle, Skeleton } from '../../components/ui'
import { useGeolocation } from '../../hooks/useGeolocation'
import { useProfessionals } from '../../hooks/usePersonData'
import type { Specialty } from '../../lib/database.types'
import { distanceKm } from '../../lib/geo'
import { SPECIALTIES } from '../../lib/specialties'

type Filter = Specialty | 'todos'
const MAX_KM = 5

export function PertoDeVoce() {
  const [params, setParams] = useSearchParams()
  const filter = (params.get('especialidade') as Filter | null) ?? 'todos'
  const geo = useGeolocation()
  const pros = useProfessionals()

  const ofSpecialty = useMemo(
    () => (pros.data ?? []).filter((p) => filter === 'todos' || p.specialty === filter),
    [pros.data, filter],
  )

  // Quem atende presencialmente tem ponto no mapa e entra na lista por distância.
  const list = useMemo(
    () =>
      ofSpecialty
        .filter((p) => p.modality !== 'online' && p.lat != null && p.lng != null)
        .map((p) => ({ pro: p, km: distanceKm(geo.position, { lat: p.lat!, lng: p.lng! }) }))
        .sort((a, b) => a.km - b.km),
    [ofSpecialty, geo.position],
  )

  // Quem atende só online não tem endereço: aparece numa lista própria, para qualquer lugar.
  const onlineOnly = useMemo(
    () => ofSpecialty.filter((p) => p.modality === 'online').sort((a, b) => a.profiles.full_name.localeCompare(b.profiles.full_name, 'pt-BR')),
    [ofSpecialty],
  )

  // Mostra quem está até 5 km; se ninguém estiver, mostra os mais perto mesmo assim.
  const nearby = list.filter((x) => x.km <= MAX_KM)
  const shown = nearby.length > 0 ? nearby : list.slice(0, 5)

  return (
    <section className="space-y-4">
      <PageHeader
        title="Perto de você"
        back={{ to: '/saude', label: 'Saúde' }}
        subtitle={
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {geo.loading ? 'Buscando sua localização…' : geo.precise ? `Sua localização · até ${MAX_KM} km` : 'Localização aproximada: Pinheiros, SP'}
          </span>
        }
      />

      <ChipTabs<Filter>
        label="Especialidade"
        value={filter}
        onChange={(v) => setParams(v === 'todos' ? {} : { especialidade: v }, { replace: true })}
        options={[{ value: 'todos', label: 'Todos' }, ...SPECIALTIES.map((s) => ({ value: s.value, label: s.label }))]}
      />

      {pros.isLoading ? (
        <Skeleton className="h-56" />
      ) : (
        <ProMap center={geo.position} pros={shown.map((x) => x.pro)} />
      )}

      {pros.error ? (
        <ErrorState message={pros.error.message} onRetry={() => pros.refetch()} />
      ) : (
        <>
          <SectionTitle>
            {pros.isLoading
              ? 'Procurando…'
              : nearby.length > 0
                ? `${nearby.length} ${nearby.length === 1 ? 'profissional' : 'profissionais'} por perto`
                : 'Ninguém até 5 km · os mais próximos'}
          </SectionTitle>
          <ul className="space-y-3">
            {pros.isLoading
              ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)
              : shown.map(({ pro, km }) => (
                  <li key={pro.id}>
                    <ProCard pro={pro} distanceKm={km} />
                  </li>
                ))}
          </ul>

          {!pros.isLoading && onlineOnly.length > 0 && (
            <>
              <SectionTitle>Atendem online, de qualquer lugar</SectionTitle>
              <ul className="space-y-3">
                {onlineOnly.map((pro) => (
                  <li key={pro.id}>
                    <ProCard pro={pro} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <p className="text-center text-xs text-muted">
        A Skyro usa sua localização só para mostrar quem está perto. Ela não é salva.
      </p>
      <DemoBanner />
    </section>
  )
}
