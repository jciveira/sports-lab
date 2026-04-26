import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Lock, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

const ADMIN_PIN_HASH = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'
const SESSION_KEY = 'hbl_admin_auth'

async function hashPin(pin: string): Promise<string> {
  const encoded = new TextEncoder().encode(pin)
  const buffer = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function isAuthenticated(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === 'true'
}

export function AdminGuard() {
  const [authed, setAuthed] = useState(isAuthenticated)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [checking, setChecking] = useState(false)

  if (authed) return <Outlet />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (checking || pin.trim().length === 0) return
    setChecking(true)
    setError(false)

    const hash = await hashPin(pin.trim())
    if (hash === ADMIN_PIN_HASH) {
      sessionStorage.setItem(SESSION_KEY, 'true')
      setAuthed(true)
    } else {
      setError(true)
      setPin('')
    }
    setChecking(false)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-hbl-bg p-6 gap-6">
      <Link
        to="/"
        className="absolute top-4 left-4 text-hbl-text-muted hover:text-hbl-text transition-colors"
        aria-label="Volver al inicio"
      >
        <ArrowLeft className="w-5 h-5" />
      </Link>

      <div className="flex flex-col items-center gap-2">
        <Lock className="w-8 h-8 text-hbl-accent" />
        <h1 className="text-xl font-bold text-hbl-text">Administración</h1>
        <p className="text-sm text-hbl-text-muted">Introduce el PIN de acceso</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-3 w-full max-w-xs">
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => { setPin(e.target.value); setError(false) }}
          placeholder="PIN"
          maxLength={10}
          autoFocus
          className="w-full px-4 py-3 rounded-lg bg-hbl-surface border border-hbl-border text-center text-2xl tracking-[0.3em] font-mono text-hbl-text placeholder:text-hbl-text-muted/40 placeholder:tracking-normal placeholder:text-base focus:outline-none focus:border-hbl-accent transition-colors"
        />
        {error && (
          <p className="text-sm text-hbl-clock">PIN incorrecto</p>
        )}
        <button
          type="submit"
          disabled={checking || pin.trim().length === 0}
          className="w-full px-6 py-3 rounded-lg bg-hbl-accent text-hbl-bg font-medium disabled:opacity-40 active:scale-95 transition-transform"
        >
          {checking ? 'Verificando...' : 'Acceder'}
        </button>
      </form>
    </div>
  )
}
