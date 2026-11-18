import { useEffect, useState } from 'react'
import { DEFAULT_LOCATION, type LatLng } from '../lib/geo'

export interface GeoState {
  position: LatLng
  /** true quando é a localização real do aparelho; false = ponto padrão (Pinheiros) */
  precise: boolean
  loading: boolean
}

/**
 * Pede a localização uma vez. Se negar ou falhar, usa Pinheiros sem travar a tela.
 * Com onlyIfAllowed, não abre o pedido de permissão: só usa a localização se a
 * pessoa já tiver deixado antes (ex.: a prévia do mapa na tela Saúde).
 */
export function useGeolocation({ onlyIfAllowed = false }: { onlyIfAllowed?: boolean } = {}): GeoState {
  const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator
  // Sem como consultar a permissão, o modo onlyIfAllowed fica no ponto padrão.
  const canAsk = supported && (!onlyIfAllowed || Boolean(navigator.permissions?.query))
  const [state, setState] = useState<GeoState>({ position: DEFAULT_LOCATION, precise: false, loading: canAsk })

  useEffect(() => {
    if (!canAsk) return
    let active = true
    const locate = () =>
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          active &&
          setState({ position: { lat: pos.coords.latitude, lng: pos.coords.longitude }, precise: true, loading: false }),
        () => active && setState((s) => ({ ...s, loading: false })),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
      )
    if (!onlyIfAllowed) locate()
    else
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((p) => (p.state === 'granted' ? locate() : active && setState((s) => ({ ...s, loading: false }))))
        .catch(() => active && setState((s) => ({ ...s, loading: false })))
    return () => {
      active = false
    }
  }, [canAsk, onlyIfAllowed])

  return state
}
