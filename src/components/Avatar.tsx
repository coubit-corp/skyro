/**
 * Avatar ilustrado gerado a partir de uma semente (DiceBear), no estilo dos mockups.
 * Não usa foto real de ninguém.
 */
export function Avatar({ seed, name, size = 48 }: { seed: string | null | undefined; name: string; size?: number }) {
  const src = `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(seed || name)}&backgroundColor=dfe5f8`
  return (
    <img
      src={src}
      alt={`Avatar de ${name}`}
      width={size}
      height={size}
      loading="lazy"
      className="shrink-0 rounded-full bg-lavender-soft"
      style={{ width: size, height: size }}
    />
  )
}
