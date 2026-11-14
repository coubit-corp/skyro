import { useState } from 'react'
import { avatarTraits, type HairStyle } from '../lib/avatar'
import { avatarUrl } from '../lib/supabase'

/** Cabelo desenhado atrás da cabeça (cabelo longo e cacheado). */
function HairBack({ style, color }: { style: HairStyle; color: string }) {
  if (style === 'longo') return <path d="M27 40c0-14 9-22 21-22s21 8 21 22v26H27z" fill={color} />
  if (style === 'cacheado')
    return (
      <g fill={color}>
        {[[34, 30], [42, 24], [52, 23], [61, 29], [65, 39], [31, 40], [35, 47], [62, 48]].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="8" />
        ))}
      </g>
    )
  return null
}

/** Cabelo desenhado por cima da testa. */
function HairFront({ style, color }: { style: HairStyle; color: string }) {
  switch (style) {
    case 'curto':
      return <path d="M32 39c0-11 7-17 16-17s16 6 16 17c-4-5-10-7-16-7s-12 2-16 7z" fill={color} />
    case 'longo':
      return <path d="M31 41c1-12 8-18 17-18s16 6 17 18c-6-6-11-8-17-8-5 0-11 2-17 8z" fill={color} />
    case 'coque':
      return (
        <g fill={color}>
          <circle cx="48" cy="18" r="7" />
          <path d="M32 39c0-11 7-17 16-17s16 6 16 17c-4-4-10-6-16-6s-12 2-16 6z" />
        </g>
      )
    case 'cacheado':
      return <path d="M33 38c2-9 8-13 15-13s13 4 15 13c-5-3-10-4-15-4s-10 1-15 4z" fill={color} />
    case 'raspado':
      return <path d="M33 36c1-9 7-13 15-13s14 4 15 13c-4-3-9-4-15-4s-11 1-15 4z" fill={color} opacity=".55" />
  }
}

/**
 * Imagem de perfil. Se a pessoa enviou uma foto, mostra a foto; senão (ou se a
 * foto não carregar), mostra o avatar ilustrado, desenhado no próprio app a
 * partir de uma semente, sem depender de serviço externo.
 */
export function Avatar({
  seed,
  name,
  size = 48,
  photo,
  src,
}: {
  seed: string | null | undefined
  name: string
  size?: number
  /** Caminho da foto no bucket (profiles.avatar_path) */
  photo?: string | null
  /** Link direto, para a prévia de uma foto ainda não enviada */
  src?: string | null
}) {
  const url = src ?? avatarUrl(photo)
  const [failed, setFailed] = useState<string | null>(null)
  if (url && failed !== url) {
    return (
      <img
        src={url}
        alt={`Foto de ${name}`}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(url)}
        className="shrink-0 rounded-full bg-lavender-soft object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return <IllustratedAvatar seed={seed} name={name} size={size} />
}

function IllustratedAvatar({ seed, name, size }: { seed: string | null | undefined; name: string; size: number }) {
  const t = avatarTraits(seed || name)
  return (
    <svg
      viewBox="0 0 96 96"
      width={size}
      height={size}
      role="img"
      aria-label={`Avatar de ${name}`}
      className="shrink-0 overflow-hidden rounded-full"
      style={{ width: size, height: size }}
    >
      <rect width="96" height="96" fill="#dfe5f8" />
      {/* Aumenta ~15% e desce um pouco o desenho para o rosto preencher o círculo */}
      <g transform="translate(-7.2 -1) scale(1.15)">
        <HairBack style={t.hairStyle} color={t.hair} />
        <path d="M20 96c2-16 14-25 28-25s26 9 28 25z" fill={t.shirt} />
        <rect x="42" y="56" width="12" height="14" rx="5" fill={t.skin} />
        <circle cx="48" cy="42" r="16" fill={t.skin} />
        <HairFront style={t.hairStyle} color={t.hair} />
        <circle cx="42" cy="44" r="1.8" fill="#1c2a4d" />
        <circle cx="54" cy="44" r="1.8" fill="#1c2a4d" />
        <path d="M43 50c3 3 7 3 10 0" stroke="#1c2a4d" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  )
}
