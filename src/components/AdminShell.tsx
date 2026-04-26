import { Link, Outlet, useLocation } from 'react-router-dom'
import { Radio, Trophy, Shield, Users } from 'lucide-react'

const tabs = [
  { to: '/admin/partidos', prefix: ['/admin/partidos', '/admin/match'], icon: Radio, label: 'Partidos' },
  { to: '/admin/torneos', prefix: ['/admin/torneos'], icon: Trophy, label: 'Torneos' },
  { to: '/admin/equipos', prefix: ['/admin/equipos'], icon: Shield, label: 'Equipos' },
  { to: '/admin/jugadores', prefix: ['/admin/jugadores'], icon: Users, label: 'Jugadores' },
] as const

const DETAIL_PATTERNS = [
  '/admin/match/',
  '/admin/partidos/nuevo',
  '/admin/equipos/',     // roster sub-pages
  '/admin/torneos/nuevo',
]

export function AdminShell() {
  const { pathname } = useLocation()

  const isDetail = DETAIL_PATTERNS.some((p) => {
    if (p.endsWith('/')) return pathname.startsWith(p) && pathname !== p.slice(0, -1)
    return pathname === p
  })

  return (
    <div className="flex flex-col min-h-dvh bg-hbl-bg">
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>

      {!isDetail && (
        <nav className="shrink-0 border-t border-hbl-border bg-hbl-surface safe-bottom">
          <div className="flex justify-around items-center h-14 max-w-lg mx-auto">
            {tabs.map(({ to, prefix, icon: Icon, label }) => {
              const isActive = prefix.some((p) => pathname.startsWith(p))
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                    isActive ? 'text-hbl-accent' : 'text-hbl-text-muted'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}
