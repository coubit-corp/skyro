import { DAY_NAMES, type Availability } from '../lib/profile'

const DEFAULT_RANGE: [string, string] = ['08:00', '18:00']

/** Horários de atendimento: liga cada dia e escolhe início e fim. */
export function AvailabilityEditor({
  value,
  errors,
  onChange,
}: {
  value: Availability
  errors: Record<string, string>
  onChange: (next: Availability) => void
}) {
  return (
    <fieldset className="card space-y-1">
      <legend className="eyebrow float-left mb-2 w-full">Horários de atendimento</legend>
      <p className="clear-both pb-1 text-xs text-muted">
        Aparecem no seu perfil. Deixe desligados os dias em que você não atende.
      </p>
      <ul className="divide-y divide-line">
        {DAY_NAMES.map((dayName, i) => {
          const day = String(i + 1)
          const range = value[day]
          const error = errors[day]
          return (
            <li key={day} className="py-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <label className="flex min-h-11 w-28 cursor-pointer items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-primary"
                    checked={Boolean(range)}
                    onChange={(e) => {
                      const next = { ...value }
                      if (e.target.checked) next[day] = DEFAULT_RANGE
                      else delete next[day]
                      onChange(next)
                    }}
                  />
                  {dayName}
                </label>
                {range ? (
                  <div className="flex items-center gap-2 text-sm">
                    <input
                      type="time"
                      className="input w-auto px-3 py-2"
                      aria-label={`${dayName}: início`}
                      aria-invalid={Boolean(error)}
                      value={range[0]}
                      onChange={(e) => onChange({ ...value, [day]: [e.target.value, range[1]] })}
                    />
                    <span className="text-muted">às</span>
                    <input
                      type="time"
                      className="input w-auto px-3 py-2"
                      aria-label={`${dayName}: fim`}
                      aria-invalid={Boolean(error)}
                      value={range[1]}
                      onChange={(e) => onChange({ ...value, [day]: [range[0], e.target.value] })}
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted">Não atende</span>
                )}
              </div>
              {error && (
                <p role="alert" className="pt-1 text-xs font-medium text-attention">
                  {dayName}: {error}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}
