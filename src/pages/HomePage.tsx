import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Users, Shield, HelpCircle, MessageSquarePlus, Download, Radio, ChevronDown, ChevronUp, Settings, Tv } from 'lucide-react'
import { usePwaInstall } from '../hooks/usePwaInstall'

const viewerLinks = [
  { to: '/games', icon: Radio, label: 'Centro de partidos', desc: 'Partidos en directo y resultados' },
  { to: '/tournaments', icon: Trophy, label: 'Torneos', desc: 'Descubre torneos y resultados' },
  { to: '/scoreboard', icon: Tv, label: 'Marcador rápido', desc: 'Partido local sin códigos' },
  { to: '/help', icon: HelpCircle, label: 'Guía para padres', desc: 'Cómo seguir y anotar partidos' },
  { to: '/suggestions', icon: MessageSquarePlus, label: 'Sugerencias', desc: 'Enviar una idea o mejora' },
] as const

const adminLinks = [
  { to: '/admin/partidos', icon: Radio, label: 'Partidos', desc: 'Gestionar partidos', disabled: false },
  { to: '/admin/equipos', icon: Shield, label: 'Equipos', desc: 'Gestionar equipos y logos', disabled: false },
  { to: '/admin/torneos', icon: Trophy, label: 'Torneos', desc: 'Gestionar torneos', disabled: false },
  { to: '/admin/jugadores', icon: Users, label: 'Jugadores', desc: 'Gestionar jugadores por equipo', disabled: false },
] as const

function NavCard({ to, icon: Icon, label, desc, disabled }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string; desc: string; disabled?: boolean }) {
  if (disabled) {
    return (
      <div className="flex items-center gap-4 p-4 rounded-xl bg-hbl-surface border border-hbl-border opacity-40">
        <Icon className="w-6 h-6 text-hbl-text-muted" />
        <div className="text-left">
          <span className="font-medium">{label}</span>
          <p className="text-xs text-hbl-text-muted">{desc} — próximamente</p>
        </div>
      </div>
    )
  }

  return (
    <Link
      to={to}
      className="flex items-center gap-4 p-4 rounded-xl bg-hbl-surface border border-hbl-border hover:border-hbl-accent transition-colors active:scale-[0.98]"
    >
      <Icon className="w-6 h-6 text-hbl-accent" />
      <div className="text-left">
        <span className="font-medium">{label}</span>
        <p className="text-xs text-hbl-text-muted">{desc}</p>
      </div>
    </Link>
  )
}

export function HomePage() {
  const { state: installState, triggerInstall } = usePwaInstall()
  const [adminOpen, setAdminOpen] = useState(false)

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-hbl-bg p-6 gap-8">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-4xl font-bold text-hbl-accent tracking-tight">HandBallLab</h1>
        <p className="text-hbl-text-muted text-sm">Puntuación. Seguimiento. Competición.</p>
      </div>

      {/* Viewer / spectator actions */}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {viewerLinks.map(({ to, icon, label, desc }) => (
          <NavCard key={to} to={to} icon={icon} label={label} desc={desc} />
        ))}
      </div>

      {/* Admin section — collapsible */}
      <div className="w-full max-w-sm">
        <button
          onClick={() => setAdminOpen(!adminOpen)}
          className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg border border-hbl-border text-sm text-hbl-text-muted hover:border-hbl-accent/50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Administración
          </span>
          {adminOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {adminOpen && (
          <div className="flex flex-col gap-3 mt-3">
            {adminLinks.map(({ to, icon, label, desc, disabled }) => (
              <NavCard key={to} to={to} icon={icon} label={label} desc={desc} disabled={disabled} />
            ))}
          </div>
        )}
      </div>

      {/* PWA install prompt — always visible when not installed */}
      {installState === 'android-prompt' && (
        <button
          onClick={triggerInstall}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-hbl-accent/30 bg-hbl-accent/5 text-hbl-accent text-sm hover:border-hbl-accent hover:bg-hbl-accent/10 transition-colors active:scale-95"
        >
          <Download className="w-4 h-4" />
          Instalar app en tu móvil
        </button>
      )}

      {installState === 'android-tip' && (
        <div className="flex items-start gap-2 px-4 py-2.5 rounded-lg border border-hbl-border text-xs text-hbl-text-muted max-w-xs">
          <Download className="w-4 h-4 mt-0.5 shrink-0 text-hbl-accent" />
          <p>
            Para instalar: abre el <strong>menú de Chrome</strong> (⋮) → <strong>Instalar aplicación</strong>
          </p>
        </div>
      )}

      {installState === 'ios-tip' && (
        <div className="flex items-start gap-2 px-4 py-2.5 rounded-lg border border-hbl-border text-xs text-hbl-text-muted max-w-xs">
          <Download className="w-4 h-4 mt-0.5 shrink-0 text-hbl-accent" />
          <p>
            Para instalar: pulsa <strong>Compartir</strong> → <strong>Añadir a pantalla de inicio</strong>
          </p>
        </div>
      )}

      {installState === 'desktop-tip' && (
        <div className="flex items-start gap-2 px-4 py-2.5 rounded-lg border border-hbl-border text-xs text-hbl-text-muted max-w-xs">
          <Download className="w-4 h-4 mt-0.5 shrink-0 text-hbl-accent" />
          <p>
            Para instalar: busca el icono de instalar en la barra de direcciones del navegador
          </p>
        </div>
      )}

      <p className="text-xs text-hbl-text-muted/50">
        Un proyecto de Civeira Lab
      </p>
    </div>
  )
}
