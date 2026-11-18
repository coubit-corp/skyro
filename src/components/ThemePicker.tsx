import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { readThemePref, saveThemePref, THEME_OPTIONS, type ThemePref } from '../lib/theme'

const ICONS: Record<ThemePref, LucideIcon> = { claro: Sun, escuro: Moon, sistema: Monitor }

/** "Aparência" em Meu perfil: troca na hora, sem precisar salvar. */
export function ThemePicker() {
  const [pref, setPref] = useState<ThemePref>(readThemePref)
  const titleId = useId()

  return (
    <div className="card space-y-3">
      <div>
        <h2 id={titleId} className="eyebrow">
          Aparência
        </h2>
        <p className="mt-1 text-xs text-muted">
          Vale só neste aparelho. No automático, segue o modo claro ou escuro do celular ou do computador.
        </p>
      </div>
      <div role="radiogroup" aria-labelledby={titleId} className="grid grid-cols-3 gap-2">
        {THEME_OPTIONS.map((o) => {
          const Icon = ICONS[o.value]
          const active = pref === o.value
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                setPref(o.value)
                saveThemePref(o.value)
              }}
              className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-3 text-sm font-semibold transition ${
                active ? 'border-primary bg-lavender-soft text-primary' : 'border-line bg-card text-ink hover:border-lavender'
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
