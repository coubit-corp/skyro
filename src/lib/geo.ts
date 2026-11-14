export interface LatLng {
  lat: number
  lng: number
}

/** Usado quando a pessoa não libera a localização: Largo da Batata, Pinheiros. */
export const DEFAULT_LOCATION: LatLng = { lat: -23.5668, lng: -46.6936 }

/** Distância em km entre dois pontos (fórmula de haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371
  const toRad = (v: number) => (v * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** 0.6 → "600 m" ; 2.43 → "2,4 km" */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round((km * 1000) / 50) * 50} m`
  return `${km.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`
}
