import { useEffect, useState } from 'react'
import { DEFAULT_LOCATION, type LatLng } from '../lib/geo'

export interface GeoState {
  position: LatLng
  /** true quando é a localização real do aparelho; false = ponto padrão (Pinheiros) */
  precise: boolean
  loading: boolean
}

/** Pede a localização uma vez. Se negar ou falhar, usa Pinheiros sem travar a tela. */
export function useGeolocation(): GeoState {
  const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator
  const [state, setState] = useState<GeoState>({ position: DEFAULT_LOCATION, precise: false, loading: supported })

  useEffect(() => {
    if (!supported) return
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setState({ position: { lat: pos.coords.latitude, lng: pos.coords.longitude }, precise: true, loading: false }),
      () => setState((s) => ({ ...s, loading: false })),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
    )
  }, [supported])

  return state
}
