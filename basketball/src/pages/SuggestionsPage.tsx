import { useState } from 'react'
import { BackButton } from '../components/BackButton'
import { submitSuggestion } from '../lib/suggestions'

export function SuggestionsPage() {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setStatus('sending')
    try {
      await submitSuggestion(text.trim())
      setStatus('sent')
      setText('')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="relative min-h-screen bg-bbl-bg text-bbl-text flex flex-col">
      <BackButton to="/mas" />
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6 pt-16">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-bbl-accent">Sugerencias</h1>
          <p className="text-xs text-bbl-text-muted">¿Tienes alguna idea o mejora? Cuéntanos.</p>
        </div>

        {status === 'sent' ? (
          <div className="p-4 rounded-xl bg-bbl-surface border border-bbl-accent/30 text-bbl-accent text-sm text-center">
            ¡Gracias! Tu sugerencia ha sido enviada.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escribe tu sugerencia aquí…"
              rows={5}
              className="w-full px-4 py-3 rounded-xl bg-bbl-surface border border-bbl-border text-bbl-text placeholder:text-bbl-text-muted focus:outline-none focus:border-bbl-accent resize-none"
            />
            {status === 'error' && (
              <p className="text-xs text-bbl-clock">No se pudo enviar. Inténtalo de nuevo.</p>
            )}
            <button
              type="submit"
              disabled={status === 'sending' || !text.trim()}
              className="flex items-center justify-center px-6 py-3 rounded-xl bg-bbl-accent text-bbl-bg font-bold min-h-12 disabled:opacity-40 active:scale-95 transition-transform"
            >
              {status === 'sending' ? 'Enviando…' : 'Enviar sugerencia'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
