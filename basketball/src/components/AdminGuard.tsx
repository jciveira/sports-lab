import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Lock, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

const ADMIN_PIN_HASH = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'
const SESSION_KEY = 'bbl_admin_auth'

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
    <div className="flex flex-col items-center justify-center min-h-dvh bg-gray-950 p-6 gap-6">
      <Link
        to="/"
        className="absolute top-4 left-4 text-gray-500 hover:text-white transition-colors"
        aria-label="Volver al inicio"
      >
        <ArrowLeft className="w-5 h-5" />
      </Link>

      <div className="flex flex-col items-center gap-2">
        <Lock className="w-8 h-8 text-orange-400" />
        <h1 className="text-xl font-bold text-white">Administración</h1>
        <p className="text-sm text-gray-400">Introduce el PIN de acceso</p>
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
          className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-700 text-center text-2xl tracking-[0.3em] font-mono text-white placeholder:text-gray-600 placeholder:tracking-normal placeholder:text-base focus:outline-none focus:border-orange-400 transition-colors"
        />
        {error && <p className="text-sm text-red-400">PIN incorrecto</p>}
        <button
          type="submit"
          disabled={checking || pin.trim().length === 0}
          className="w-full px-6 py-3 rounded-xl bg-orange-400 text-gray-950 font-bold disabled:opacity-40 active:scale-95 transition-transform"
        >
          {checking ? 'Verificando...' : 'Acceder'}
        </button>
      </form>
    </div>
  )
}
