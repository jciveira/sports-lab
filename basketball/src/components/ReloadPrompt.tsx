import { useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useLocation } from 'react-router-dom'
import { RefreshCw, X } from 'lucide-react'

export function ReloadPrompt() {
  const location = useLocation()
  const [dismissed, setDismissed] = useState(false)

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  const isMatchRoute = /^\/match\//.test(location.pathname)

  if (!needRefresh || dismissed || isMatchRoute) return null

  return (
    <div
      role="alert"
      className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm flex items-center gap-3 rounded-xl bg-bbl-surface border border-bbl-border p-3 shadow-lg animate-in slide-in-from-bottom-4"
    >
      <RefreshCw className="w-5 h-5 text-bbl-accent shrink-0" />
      <p className="text-sm text-bbl-text flex-1">Nueva versión disponible</p>
      <button
        onClick={() => updateServiceWorker(true)}
        className="px-3 py-1.5 rounded-lg bg-bbl-accent text-bbl-bg text-xs font-bold active:scale-95 transition-transform"
      >
        Actualizar
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded-lg text-bbl-text-muted hover:text-bbl-text transition-colors"
        aria-label="Cerrar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
