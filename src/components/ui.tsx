import { ChevronLeft } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** Título grande + subtítulo, como no topo de cada tela dos mockups. */
export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string
  subtitle?: ReactNode
  back?: { to: string; label: string }
  action?: ReactNode
}) {
  return (
    <header className="mb-5 space-y-3">
      {back && (
        <Link to={back.to} className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> {back.label}
        </Link>
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-bold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mt-6 mb-3 flex items-center justify-between">
      <h2 className="eyebrow">{children}</h2>
      {action}
    </div>
  )
}

/** Bloco cinza pulsando enquanto carrega. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-card bg-lavender-soft/70 ${className}`} aria-hidden="true" />
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="card space-y-3 border border-attention-soft text-sm">
      <p className="font-semibold text-attention">Não foi possível carregar.</p>
      {message && <p className="text-muted">{message}</p>}
      {onRetry && (
        <button className="btn-outline py-2" onClick={onRetry}>
          Tentar de novo
        </button>
      )}
    </div>
  )
}

/** Caixa de seleção redonda/quadrada no estilo dos mockups. */
export function CheckButton({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition disabled:opacity-50 ${
        checked ? 'border-primary bg-primary text-white' : 'border-muted/60 bg-card'
      }`}
    >
      {checked && (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
          <path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      )}
    </button>
  )
}

/** Modal acessível baseado no <dialog> nativo (fecha com Esc e clique fora). */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-card bg-card p-0 text-ink backdrop:bg-navy/50"
    >
      <div className="space-y-4 p-5">
        <h2 className="text-lg font-bold">{title}</h2>
        {children}
      </div>
    </dialog>
  )
}

/** Faixa de botões para escolher um valor (chips roláveis). */
export function ChipTabs<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="tablist" aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
            value === o.value ? 'border-navy bg-navy text-white' : 'border-line bg-card text-ink hover:border-lavender'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
