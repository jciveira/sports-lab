import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Settings, Download, MessageSquarePlus, Trash2, Smartphone } from 'lucide-react'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { useFontSize } from '../hooks/useFontSize'
import type { FontSize } from '../hooks/useFontSize'

const FONT_LABELS: Record<FontSize, string> = { small: 'A', normal: 'A', large: 'A' }
const FONT_SIZES: FontSize[] = ['small', 'normal', 'large']

export function MasTab() {
  const { state: installState, triggerInstall } = usePwaInstall()
  const { fontSize, setFontSize } = useFontSize()
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showIosGuide, setShowIosGuide] = useState(false)

  function handleClearCache() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()))
    }
    if ('caches' in window) {
      caches.keys().then(keys => keys.forEach(k => caches.delete(k)))
    }
    setShowClearConfirm(false)
    setTimeout(() => window.location.reload(), 300)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-6">
      <h1 className="text-xl font-bold text-bbl-text">Más</h1>

      {/* Install prompt */}
      {installState === 'android-prompt' && (
        <button
          onClick={triggerInstall}
          className="flex items-center gap-4 p-4 rounded-xl bg-bbl-accent/10 border border-bbl-accent/30 active:scale-[0.98] transition-transform text-left"
        >
          <Download className="w-5 h-5 text-bbl-accent shrink-0" />
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold text-bbl-accent">Instalar la app</p>
            <p className="text-xs text-bbl-text-muted">Añadir a la pantalla de inicio para acceso rápido</p>
          </div>
        </button>
      )}

      {installState === 'android-tip' && (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-bbl-surface border border-bbl-border">
          <Download className="w-5 h-5 text-bbl-accent shrink-0" />
          <p className="text-xs text-bbl-text-muted">Para instalar: pulsa el menú del navegador → "Añadir a pantalla de inicio"</p>
        </div>
      )}

      {installState === 'ios-tip' && (
        <button
          onClick={() => setShowIosGuide(true)}
          className="flex items-center gap-4 p-4 rounded-xl bg-bbl-surface border border-bbl-border active:scale-[0.98] transition-transform text-left"
        >
          <Smartphone className="w-5 h-5 text-bbl-accent shrink-0" />
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold text-bbl-text">Instalar en iPhone</p>
            <p className="text-xs text-bbl-text-muted">Ver cómo añadir a la pantalla de inicio</p>
          </div>
        </button>
      )}

      {installState === 'desktop-tip' && (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-bbl-surface border border-bbl-border">
          <Download className="w-5 h-5 text-bbl-accent shrink-0" />
          <p className="text-xs text-bbl-text-muted">En el navegador puedes instalar esta app desde el menú o la barra de direcciones</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {/* Suggestions */}
        <Link
          to="/suggestions"
          className="flex items-center gap-4 p-4 rounded-xl bg-bbl-surface border border-bbl-border active:scale-[0.98] transition-transform"
        >
          <MessageSquarePlus className="w-5 h-5 text-bbl-accent shrink-0" />
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold text-bbl-text">Sugerencias</p>
            <p className="text-xs text-bbl-text-muted">¿Tienes alguna idea o mejora?</p>
          </div>
        </Link>

        {/* Admin */}
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

      {/* Font size */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-bbl-text-muted uppercase tracking-wide">Tamaño del marcador</p>
        <div className="flex gap-2">
          {FONT_SIZES.map(size => (
            <button
              key={size}
              onClick={() => setFontSize(size)}
              className={`flex-1 py-2 rounded-lg border text-center transition-colors ${
                fontSize === size
                  ? 'bg-bbl-accent text-bbl-bg border-bbl-accent font-bold'
                  : 'bg-bbl-surface text-bbl-text border-bbl-border'
              }`}
              style={{ fontSize: size === 'small' ? '0.75rem' : size === 'large' ? '1.1rem' : '0.875rem' }}
            >
              {FONT_LABELS[size]}
            </button>
          ))}
        </div>
      </div>

      {/* Clear cache */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-bbl-text-muted uppercase tracking-wide">Mantenimiento</p>
        <button
          onClick={() => setShowClearConfirm(true)}
          className="flex items-center gap-4 p-4 rounded-xl bg-bbl-surface border border-bbl-border active:scale-[0.98] transition-transform text-left"
        >
          <Trash2 className="w-5 h-5 text-bbl-clock shrink-0" />
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold text-bbl-text">Limpiar caché</p>
            <p className="text-xs text-bbl-text-muted">Fuerza la actualización de la app</p>
          </div>
        </button>
      </div>

      <p className="text-xs text-bbl-text-muted text-center pt-2">BasketballLab · Civeira Lab</p>

      {/* Clear cache confirmation modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50 pb-6 px-4">
          <div className="w-full max-w-sm bg-bbl-surface rounded-2xl p-6 flex flex-col gap-4">
            <h2 className="text-base font-bold text-bbl-text">¿Limpiar caché?</h2>
            <p className="text-sm text-bbl-text-muted">Se eliminará el caché local y la app se recargará.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-bbl-border text-bbl-text text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearCache}
                className="flex-1 py-3 rounded-xl bg-bbl-clock text-white text-sm font-semibold"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS install guide modal */}
      {showIosGuide && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50 pb-6 px-4">
          <div className="w-full max-w-sm bg-bbl-surface rounded-2xl p-6 flex flex-col gap-4">
            <h2 className="text-base font-bold text-bbl-text">Instalar en iPhone</h2>
            <ol className="flex flex-col gap-2 text-sm text-bbl-text-muted list-decimal list-inside">
              <li>Pulsa el botón de compartir <span className="text-bbl-text">⎙</span> en Safari</li>
              <li>Selecciona <span className="font-semibold text-bbl-text">"Añadir a la pantalla de inicio"</span></li>
              <li>Pulsa <span className="font-semibold text-bbl-text">"Añadir"</span></li>
            </ol>
            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-3 rounded-xl bg-bbl-accent text-bbl-bg text-sm font-bold"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
