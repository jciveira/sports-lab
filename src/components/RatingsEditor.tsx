import { useState, useEffect, useRef } from 'react'
import type { PlayerRatings } from '../lib/database.types'
import { getStatKeys, getStatLabels, emptyRatings, computeMedia, validateRatings } from '../lib/ratings'

interface RatingsEditorProps {
  role: string
  ratings: PlayerRatings | null
  onChange: (ratings: PlayerRatings | null) => void
}

export function RatingsEditor({ role, ratings, onChange }: RatingsEditorProps) {
  const [enabled, setEnabled] = useState(ratings !== null)
  const [local, setLocal] = useState<PlayerRatings>(ratings ?? emptyRatings(role))
  const [error, setError] = useState<string | null>(null)
  const prevRoleRef = useRef(role)

  // Reset ratings only when role actually changes (GK <-> field have different stat keys)
  useEffect(() => {
    if (prevRoleRef.current === role) return
    prevRoleRef.current = role
    const newRatings = emptyRatings(role)
    setLocal(newRatings)
    if (enabled) onChange(newRatings)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role])

  const keys = getStatKeys(role)
  const labels = getStatLabels(role)
  const media = computeMedia(enabled ? local : null)

  function handleToggle() {
    if (enabled) {
      setEnabled(false)
      onChange(null)
    } else {
      setEnabled(true)
      const fresh = emptyRatings(role)
      setLocal(fresh)
      onChange(fresh)
    }
  }

  function handleStatChange(key: string, value: string) {
    const num = value === '' ? 0 : parseInt(value, 10)
    if (isNaN(num)) return
    const clamped = Math.max(0, Math.min(99, num))
    const updated = { ...local, [key]: clamped } as PlayerRatings
    setLocal(updated)
    const err = validateRatings(updated)
    setError(err)
    if (!err) onChange(updated)
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-xs text-hbl-text-muted">
        <input
          type="checkbox"
          checked={enabled}
          onChange={handleToggle}
          className="rounded accent-hbl-accent"
        />
        Ratings FIFA
        {media !== null && (
          <span className="ml-auto text-hbl-accent font-bold text-sm">
            Media: {media}
          </span>
        )}
      </label>
      {enabled && (
        <div className="grid grid-cols-3 gap-2">
          {keys.map((key) => (
            <div key={key} className="flex flex-col gap-0.5">
              <label className="text-[10px] uppercase tracking-wider text-hbl-text-muted">{labels[key]}</label>
              <input
                type="number"
                min={0}
                max={99}
                value={(local as unknown as Record<string, number>)[key]}
                onChange={(e) => handleStatChange(key, e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg bg-hbl-bg border border-hbl-border text-sm text-center focus:outline-none focus:border-hbl-accent"
              />
            </div>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-hbl-clock">{error}</p>}
    </div>
  )
}
