import type { Match } from '../types'

/** Format scheduled_at for display: "vie 02 may · 15:00" */
export function formatMatchDate(scheduledAt: string | null | undefined): string | null {
  if (!scheduledAt) return null
  const d = new Date(scheduledAt)
  const day = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
  const time = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time}`
}

/** Sort matches by scheduled_at asc, nulls last */
export function sortByScheduledAt<T extends Pick<Match, 'scheduled_at'>>(matches: T[]): T[] {
  return [...matches].sort((a, b) => {
    if (!a.scheduled_at && !b.scheduled_at) return 0
    if (!a.scheduled_at) return 1
    if (!b.scheduled_at) return -1
    return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  })
}

/** Convert a UTC ISO string to the value format expected by datetime-local inputs */
export function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
