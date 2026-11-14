/** Marca da Skyro: "S" com o ponto, como nos mockups. */
export function Logo({ size = 'md', light = false }: { size?: 'md' | 'lg'; light?: boolean }) {
  const text = size === 'lg' ? 'text-3xl' : 'text-xl'
  const icon = size === 'lg' ? 'h-9 w-9' : 'h-6 w-6'
  return (
    <span className={`inline-flex items-center gap-1 font-display font-bold ${text} ${light ? 'text-white' : 'text-navy'}`}>
      <svg viewBox="0 0 64 64" className={icon} aria-hidden="true">
        <path
          d="M41 21.5c-2.4-2.6-5.6-3.9-9.2-3.9-5.5 0-9.3 3-9.3 7.5 0 4.2 3.2 6.1 8.6 7.3l2.6.6c3.3.7 4.6 1.6 4.6 3.4 0 2.1-2.1 3.5-5.4 3.5-3.4 0-6.2-1.4-8.3-4l-4 3.9c2.8 3.5 7 5.4 12 5.4 6.6 0 11.1-3.4 11.1-8.6 0-4.4-2.9-6.6-8.8-7.9l-2.6-.6c-3-.7-4.2-1.4-4.2-2.9 0-1.8 1.8-3 4.4-3 2.4 0 4.6.9 6.4 2.8z"
          fill={light ? '#8EA2E6' : '#4C63B6'}
        />
        <circle cx="46.5" cy="16.5" r="4" fill={light ? '#fff' : '#8EA2E6'} />
      </svg>
      skyro
    </span>
  )
}
