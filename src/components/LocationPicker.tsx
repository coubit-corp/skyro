import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { reverseGeocode, searchAddress, type Place } from '../lib/geocode'
import { DEFAULT_LOCATION } from '../lib/geo'

const pinIcon = L.divIcon({
  className: '',
  html: '<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#4C63B6;border:3px solid #fff;box-shadow:0 2px 6px rgba(28,42,77,.4)"></div>',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
})

export interface PickedLocation {
  lat: number
  lng: number
  neighborhood?: string
  city?: string
}

/** Clique no mapa coloca o pino. */
function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

/** Centraliza o mapa quando o ponto muda por busca. */
function FlyTo({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap()
  useEffect(() => {
    if (lat != null && lng != null) map.setView([lat, lng], Math.max(map.getZoom(), 16))
  }, [lat, lng, map])
  return null
}

/**
 * Escolha do local de atendimento: buscar o endereço OU tocar/arrastar o pino.
 * Ao soltar o pino, tenta descobrir o bairro sozinho (dá para corrigir no campo).
 */
export function LocationPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number | null
  lng: number | null
  onChange: (loc: PickedLocation) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reverseAbort = useRef<AbortController | null>(null)

  async function handleSearch() {
    if (query.trim().length < 3) return
    setError(null)
    setSearching(true)
    try {
      const found = await searchAddress(query)
      setResults(found)
      if (found.length === 0) setError('Nenhum endereço encontrado. Tente com rua, número e bairro, ou marque no mapa.')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSearching(false)
    }
  }

  async function placePin(newLat: number, newLng: number) {
    onChange({ lat: newLat, lng: newLng })
    reverseAbort.current?.abort()
    const ctrl = new AbortController()
    reverseAbort.current = ctrl
    try {
      const place = await reverseGeocode(newLat, newLng, ctrl.signal)
      if (place) onChange({ lat: newLat, lng: newLng, neighborhood: place.neighborhood, city: place.city })
    } catch {
      /* sem bairro automático: a pessoa preenche no campo */
    }
  }

  const center = lat != null && lng != null ? { lat, lng } : DEFAULT_LOCATION

  return (
    <div className="space-y-2">
      {/* Não é um <form> de verdade para não aninhar no formulário do perfil */}
      <div className="flex gap-2">
        <input
          className="input"
          placeholder="Rua, número e bairro"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Enter busca o endereço em vez de enviar o formulário do perfil
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSearch()
            }
          }}
          aria-label="Buscar endereço"
        />
        <button
          type="button"
          className="btn-outline shrink-0 px-4"
          onClick={handleSearch}
          disabled={searching || query.trim().length < 3}
        >
          <Search className="h-4 w-4" aria-hidden="true" /> {searching ? 'Buscando…' : 'Buscar'}
        </button>
      </div>

      {error && <p className="text-xs text-attention">{error}</p>}
      {results && results.length > 0 && (
        <ul className="overflow-hidden rounded-2xl border border-line bg-card text-sm">
          {results.map((r) => (
            <li key={`${r.lat},${r.lng}`}>
              <button
                type="button"
                className="w-full px-4 py-2.5 text-left hover:bg-lavender-soft"
                onClick={() => {
                  onChange({ lat: r.lat, lng: r.lng, neighborhood: r.neighborhood, city: r.city })
                  setResults(null)
                }}
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      <MapContainer center={[center.lat, center.lng]} zoom={lat != null ? 16 : 13} className="h-56 w-full overflow-hidden rounded-card" style={{ zIndex: 0 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickToPlace onPick={placePin} />
        <FlyTo lat={lat} lng={lng} />
        {lat != null && lng != null && (
          <Marker
            position={[lat, lng]}
            icon={pinIcon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const p = (e.target as L.Marker).getLatLng()
                placePin(p.lat, p.lng)
              },
            }}
          />
        )}
      </MapContainer>
      <p className="text-xs text-muted">
        {lat != null ? 'Arraste o pino para ajustar o ponto exato.' : 'Toque no mapa para marcar onde você atende.'} Busca de
        endereços: OpenStreetMap.
      </p>
    </div>
  )
}
