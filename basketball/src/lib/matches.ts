/** Format scheduled_at for display: "vie 02 may · 15:00" */
export function formatMatchDate(scheduledAt: string | null | undefined): string | null {
  if (!scheduledAt) return null
  const d = new Date(scheduledAt)
  const day = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
  const time = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time}`
}
