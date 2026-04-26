import { useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useLocation } from 'react-router-dom'
import { RefreshCw, X } from 'lucide-react'

/**
 * Shows a toast when a new service worker is waiting to activate.
 * - Tapping "Actualizar" activates the new SW and reloads
 * - Tapping X dismisses for the current session
 * - Hidden on /match/:id routes to avoid disrupting live games
 */
export function ReloadPrompt() {
  const location = useLocation()
  const [dismissed, setDismissed] = useState(false)

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  // Suppress on match pages to avoid mid-game distractions
  const isMatchRoute = /^\/match\//.test(location.pathname)

  if (!needRefresh || dismissed || isMatchRoute) return null

  return (
    <div
      role="alert"
      className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm flex items-center gap-3 rounded-xl bg-hbl-surface border border-hbl-border p-3 shadow-lg animate-in slide-in-from-bottom-4"
    >
      <RefreshCw className="w-5 h-5 text-hbl-accent shrink-0" />
      <p className="text-sm text-hbl-text flex-1">Nueva versión disponible</p>
      <button
        onClick={() => updateServiceWorker(true)}
        className="px-3 py-1.5 rounded-lg bg-hbl-accent text-hbl-bg text-xs font-bold active:scale-95 transition-transform"
      >
        Actualizar
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded-lg text-hbl-text-muted hover:text-hbl-text transition-colors"
        aria-label="Cerrar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
