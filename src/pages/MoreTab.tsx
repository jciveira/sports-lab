import { useState } from 'react'
import { Tv, HelpCircle, MessageSquarePlus, Settings, Download, ChevronRight, Trash2, Sun, Moon, Type, Share, Plus, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { useTheme } from '../hooks/useTheme'
import { useFontSize, type FontSize } from '../hooks/useFontSize'

const LINKS = [
  {
    to: '/scoreboard',
    label: 'Marcador rápido',
    desc: 'Partido local sin códigos ni conexión',
    icon: Tv,
  },
  {
    to: '/help',
    label: 'Guía para padres',
    desc: 'Cómo seguir y anotar partidos',
    icon: HelpCircle,
  },
  {
    to: '/suggestions',
    label: 'Sugerencias',
    desc: 'Enviar una idea o mejora',
    icon: MessageSquarePlus,
  },
] as const

export function MoreTab() {
  const { state: installState, triggerInstall } = usePwaInstall()
  const { theme, toggle } = useTheme()
  const { fontSize, setFontSize } = useFontSize()
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showIosGuide, setShowIosGuide] = useState(false)

  const fontSizeOptions: { value: FontSize; label: string }[] = [
    { value: 'small', label: 'Pequeño' },
    { value: 'normal', label: 'Normal' },
    { value: 'large', label: 'Grande' },
  ]

  function handleClearCache() {
    localStorage.clear()
    sessionStorage.clear()
    window.location.href = '/'
  }

  return (
    <div className="flex flex-col p-6 gap-3 max-w-sm mx-auto">
      <h1 className="text-xl font-bold text-hbl-text mb-2">Más</h1>

      {LINKS.map(({ to, label, desc, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-hbl-surface border border-hbl-border hover:border-hbl-accent/40 transition-colors"
        >
          <Icon className="w-5 h-5 text-hbl-accent shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-hbl-text">{label}</p>
            <p className="text-xs text-hbl-text-muted">{desc}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-hbl-text-muted shrink-0" />
        </Link>
      ))}

      {/* Install prompt — only shown when PWA is not installed */}
      {installState === 'android-prompt' && (
        <button
          onClick={triggerInstall}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-hbl-surface border border-hbl-accent/40 hover:border-hbl-accent transition-colors text-left"
        >
          <Download className="w-5 h-5 text-hbl-accent shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-hbl-text">Instalar app</p>
            <p className="text-xs text-hbl-text-muted">Añadir a pantalla de inicio</p>
          </div>
          <ChevronRight className="w-4 h-4 text-hbl-text-muted shrink-0" />
        </button>
      )}

      {installState === 'ios-tip' && (
        <button
          onClick={() => setShowIosGuide(true)}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-hbl-surface border border-hbl-accent/40 hover:border-hbl-accent transition-colors text-left"
        >
          <Download className="w-5 h-5 text-hbl-accent shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-hbl-text">Instalar app</p>
            <p className="text-xs text-hbl-text-muted">Ver cómo añadir a pantalla de inicio</p>
          </div>
          <ChevronRight className="w-4 h-4 text-hbl-text-muted shrink-0" />
        </button>
      )}

      {(installState === 'android-tip' || installState === 'desktop-tip') && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-hbl-surface border border-hbl-border">
          <Download className="w-5 h-5 text-hbl-accent shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-hbl-text">Instalar app</p>
            <p className="text-xs text-hbl-text-muted">
              {installState === 'android-tip'
                ? 'Abre el menú del navegador y toca "Instalar aplicación"'
                : 'Abre el menú del navegador y busca "Instalar"'}
            </p>
          </div>
        </div>
      )}

      {/* Theme toggle */}
      <button
        onClick={toggle}
        aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-hbl-surface border border-hbl-border hover:border-hbl-accent/40 transition-colors text-left"
      >
        {theme === 'dark' ? (
          <Sun className="w-5 h-5 text-hbl-accent shrink-0" />
        ) : (
          <Moon className="w-5 h-5 text-hbl-accent shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-hbl-text">
            {theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
          </p>
          <p className="text-xs text-hbl-text-muted">
            {theme === 'dark' ? 'Cambiar a modo día' : 'Cambiar a modo noche'}
          </p>
        </div>
      </button>

      {/* Font size */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-hbl-surface border border-hbl-border">
        <Type className="w-5 h-5 text-hbl-accent shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-hbl-text">Tamaño del marcador</p>
          <p className="text-xs text-hbl-text-muted">Ajusta el tamaño del reloj y los goles</p>
        </div>
        <div className="flex gap-1" role="group" aria-label="Tamaño del marcador">
          {fontSizeOptions.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFontSize(value)}
              aria-pressed={fontSize === value}
              className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                fontSize === value
                  ? 'bg-hbl-accent text-hbl-bg font-medium'
                  : 'text-hbl-text-muted hover:text-hbl-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Admin access */}
      <Link
        to="/admin/partidos"
        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-hbl-surface border border-hbl-border hover:border-hbl-accent/40 transition-colors"
      >
        <Settings className="w-5 h-5 text-hbl-accent shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-hbl-text">Administración</p>
          <p className="text-xs text-hbl-text-muted">Acceso al panel de gestión</p>
        </div>
        <ChevronRight className="w-4 h-4 text-hbl-text-muted shrink-0" />
      </Link>

      {/* Cache clear */}
      <button
        onClick={() => setShowClearConfirm(true)}
        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-hbl-surface border border-hbl-border hover:border-red-400/40 transition-colors text-left"
      >
        <Trash2 className="w-5 h-5 text-red-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-hbl-text">Limpiar caché</p>
          <p className="text-xs text-hbl-text-muted">Borrar datos locales y reiniciar</p>
        </div>
      </button>

      <p className="text-center text-xs text-hbl-text-muted mt-4">
        Un proyecto de Civeira Lab
      </p>

      {/* iOS install guide modal */}
      {showIosGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-guide-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4"
        >
          <div className="bg-hbl-surface border border-hbl-border rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 id="ios-guide-title" className="text-base font-bold text-hbl-text">Añadir a pantalla de inicio</h2>
              <button
                onClick={() => setShowIosGuide(false)}
                aria-label="Cerrar"
                className="p-1 rounded-lg text-hbl-text-muted hover:text-hbl-text transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ol className="flex flex-col gap-3">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-hbl-accent/20 text-hbl-accent text-xs font-bold flex items-center justify-center">1</span>
                <div>
                  <p className="text-sm text-hbl-text">Pulsa el botón <strong>Compartir</strong></p>
                  <div className="flex items-center gap-1 mt-1">
                    <Share className="w-5 h-5 text-blue-400" />
                    <span className="text-xs text-hbl-text-muted">Icono en la barra inferior de Safari</span>
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-hbl-accent/20 text-hbl-accent text-xs font-bold flex items-center justify-center">2</span>
                <div>
                  <p className="text-sm text-hbl-text">Desplázate y toca <strong>Añadir a pantalla de inicio</strong></p>
                  <div className="flex items-center gap-1 mt-1">
                    <Plus className="w-4 h-4 text-hbl-text-muted" />
                    <span className="text-xs text-hbl-text-muted">En el menú que se abre</span>
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-hbl-accent/20 text-hbl-accent text-xs font-bold flex items-center justify-center">3</span>
                <p className="text-sm text-hbl-text">Confirma pulsando <strong>Añadir</strong> arriba a la derecha</p>
              </li>
            </ol>
            <p className="text-xs text-hbl-text-muted text-center">Solo funciona desde Safari en iPhone/iPad</p>
          </div>
        </div>
      )}

      {/* Confirmation dialog */}
      {showClearConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-cache-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
        >
          <div className="bg-hbl-surface border border-hbl-border rounded-2xl p-6 max-w-xs w-full flex flex-col gap-4">
            <h2 id="clear-cache-title" className="text-base font-bold text-hbl-text">¿Limpiar caché?</h2>
            <p className="text-sm text-hbl-text-muted">Se cerrarán tus sesiones activas y la app se reiniciará.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2 rounded-xl border border-hbl-border text-sm text-hbl-text hover:border-hbl-accent/40 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearCache}
                className="flex-1 px-4 py-2 rounded-xl bg-red-500/10 border border-red-400/40 text-sm text-red-400 hover:bg-red-500/20 transition-colors"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
