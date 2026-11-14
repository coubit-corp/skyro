import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { Link } from 'react-router-dom'
import type { ProfessionalWithProfile } from '../hooks/usePersonData'
import type { LatLng } from '../lib/geo'
import { specialtyLabel, specialtyLetter } from '../lib/specialties'

// Marcadores em HTML/CSS (divIcon) no lugar do PNG padrão do Leaflet,
// que quebra com bundlers e não combina com o visual da Skyro.
function proIcon(letter: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:34px;height:34px;border-radius:12px 12px 12px 2px;background:#1C2A4D;color:#fff;display:flex;align-items:center;justify-content:center;font:700 14px Inter,sans-serif;box-shadow:0 2px 6px rgba(28,42,77,.35)">${letter}</div>`,
    iconSize: [34, 34],
    iconAnchor: [4, 34],
    popupAnchor: [13, -30],
  })
}

const meIcon = L.divIcon({
  className: '',
  html: '<div style="width:22px;height:22px;border-radius:50%;background:#4C63B6;border:4px solid #fff;box-shadow:0 0 0 6px rgba(76,99,182,.25)"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

export function ProMap({ center, pros }: { center: LatLng; pros: ProfessionalWithProfile[] }) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={14}
      scrollWheelZoom={false}
      className="h-56 w-full overflow-hidden rounded-card sm:h-72"
      // O mapa fica abaixo do menu fixo e dos modais
      style={{ zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[center.lat, center.lng]} icon={meIcon} title="Você" interactive={false} keyboard={false} />
      {pros
        .filter((p) => p.lat != null && p.lng != null)
        .map((p) => (
          <Marker key={p.id} position={[p.lat!, p.lng!]} icon={proIcon(specialtyLetter(p.specialty))}>
            <Popup>
              <strong>{p.profiles.full_name}</strong>
              <br />
              {specialtyLabel(p.specialty)}
              <br />
              <Link to={`/saude/profissional/${p.id}`}>Ver perfil</Link>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  )
}
