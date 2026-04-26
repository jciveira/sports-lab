import { Outlet, NavLink } from 'react-router-dom'
import { Radio, Trophy, Users, Menu } from 'lucide-react'

const TABS = [
  { to: '/partidos', label: 'Partidos', icon: Radio },
  { to: '/torneos', label: 'Torneos', icon: Trophy },
  { to: '/plantillas', label: 'Plantillas', icon: Users },
  { to: '/mas', label: 'Más', icon: Menu },
] as const

export function ViewerShell() {
  return (
    <div className="flex flex-col min-h-dvh bg-hbl-bg">
      {/* Scrollable content area */}
      <main className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>

      {/* Fixed bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 bg-hbl-surface border-t border-hbl-border z-50">
        <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
          {TABS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 px-3 py-1 transition-colors ${
                  isActive
                    ? 'text-hbl-accent'
                    : 'text-hbl-text-muted hover:text-hbl-text'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium tracking-wide">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
