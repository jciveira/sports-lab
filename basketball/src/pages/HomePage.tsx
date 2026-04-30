import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Users, Settings, ChevronDown, ChevronUp, Eye } from 'lucide-react'

const viewerLinks = [
  { to: '/tournament', icon: Trophy, label: 'Torneos', desc: 'Descubre torneos y resultados' },
  { to: '/players', icon: Users, label: 'Jugadores', desc: 'Fichas y estadísticas' },
] as const

const adminLinks = [
  { to: '/admin', icon: Settings, label: 'Panel de administración', desc: 'Gestionar partidos, equipos, torneos y jugadores' },
] as const

function NavCard({ to, icon: Icon, label, desc }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string; desc: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 p-4 rounded-xl bg-gray-900 border border-gray-700 hover:border-orange-400 transition-colors active:scale-[0.98]"
    >
      <Icon className="w-6 h-6 text-orange-400 shrink-0" />
      <div className="text-left">
        <p className="font-medium text-white">{label}</p>
        <p className="text-xs text-gray-400">{desc}</p>
      </div>
    </Link>
  )
}

export function HomePage() {
  const [adminOpen, setAdminOpen] = useState(false)

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-gray-950 p-6 gap-8">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-4xl font-bold text-orange-400 tracking-tight">BasketballLab</h1>
        <p className="text-gray-400 text-sm">Puntuación. Seguimiento. Competición.</p>
      </div>

      {/* Viewer section */}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500 px-1">
          <Eye className="w-3.5 h-3.5" />
          Espectadores
        </div>
        {viewerLinks.map(({ to, icon, label, desc }) => (
          <NavCard key={to} to={to} icon={icon} label={label} desc={desc} />
        ))}
      </div>

      {/* Admin section — collapsible */}
      <div className="w-full max-w-sm">
        <button
          onClick={() => setAdminOpen(!adminOpen)}
          className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl border border-gray-700 text-sm text-gray-400 hover:border-orange-400/50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Administración
          </span>
          {adminOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {adminOpen && (
          <div className="flex flex-col gap-3 mt-3">
            {adminLinks.map(({ to, icon, label, desc }) => (
              <NavCard key={to} to={to} icon={icon} label={label} desc={desc} />
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-600">Un proyecto de Civeira Lab</p>
    </div>
  )
}
