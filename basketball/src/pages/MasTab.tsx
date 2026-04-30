import { Link } from 'react-router-dom'
import { Settings } from 'lucide-react'

export function MasTab() {
  return (
    <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-6">
      <h1 className="text-xl font-bold text-bbl-text">Más</h1>

      <div className="flex flex-col gap-2">
        <Link
          to="/admin"
          className="flex items-center gap-4 p-4 rounded-xl bg-bbl-surface border border-bbl-border active:scale-[0.98] transition-transform"
        >
          <Settings className="w-5 h-5 text-bbl-accent shrink-0" />
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold text-bbl-text">Administración</p>
            <p className="text-xs text-bbl-text-muted">Gestionar partidos, equipos y torneos</p>
          </div>
        </Link>
      </div>

      <p className="text-xs text-bbl-text-muted text-center pt-4">BasketballLab · Civeira Lab</p>
    </div>
  )
}
