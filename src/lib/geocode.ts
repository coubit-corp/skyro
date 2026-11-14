// Busca de endereço e "endereço do ponto" com o Nominatim (OpenStreetMap):
// gratuito e sem chave. Regras de uso: no máximo 1 busca por segundo e nada de
// autocompletar a cada tecla, por isso a busca só roda ao tocar em "Buscar".

export interface Place {
  label: string
  lat: number
  lng: number
  neighborhood: string
  city: string
}

const BASE = 'https://nominatim.openstreetmap.org'

interface NominatimAddress {
  suburb?: string
  neighbourhood?: string
  quarter?: string
  city_district?: string
  city?: string
  town?: string
  municipality?: string
  village?: string
  road?: string
  house_number?: string
}

interface NominatimResult {
  lat: string
  lon: string
  display_name: string
  address?: NominatimAddress
}

/** Transforma a resposta do Nominatim no que o formulário usa. */
export function toPlace(r: NominatimResult): Place {
  const a = r.address ?? {}
  const neighborhood = a.suburb || a.neighbourhood || a.quarter || a.city_district || ''
  const city = a.city || a.town || a.municipality || a.village || ''
  const street = [a.road, a.house_number].filter(Boolean).join(', ')
  const label = [street, neighborhood, city].filter(Boolean).join(' · ') || r.display_name
  return { label, lat: Number(r.lat), lng: Number(r.lon), neighborhood, city }
}

export async function searchAddress(query: string, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim()
  if (q.length < 3) return []
  const url = `${BASE}/search?format=jsonv2&addressdetails=1&countrycodes=br&limit=5&accept-language=pt-BR&q=${encodeURIComponent(q)}`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error('Busca de endereço indisponível agora.')
  return ((await res.json()) as NominatimResult[]).map(toPlace)
}

export async function reverseGeocode(lat: number, lng: number, signal?: AbortSignal): Promise<Place | null> {
  const url = `${BASE}/reverse?format=jsonv2&addressdetails=1&zoom=17&accept-language=pt-BR&lat=${lat}&lon=${lng}`
  const res = await fetch(url, { signal })
  if (!res.ok) return null
  const data = (await res.json()) as NominatimResult & { error?: string }
  return data.error ? null : { ...toPlace(data), lat, lng }
}
