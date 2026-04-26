import { useState } from 'react'

import { Send, CheckCircle, Loader2 } from 'lucide-react'
import { BackButton } from '../components/ui/BackButton'
import { submitSuggestion } from '../lib/suggestions'

export function SuggestionsPage() {
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setSubmitting(true)
    try {
      await submitSuggestion(text.trim(), name.trim())
      setSubmitted(true)
      setText('')
      setName('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-dvh bg-hbl-bg text-hbl-text p-4 pb-12 max-w-lg mx-auto">
      <BackButton to="/help" label="Guia para padres" />

      <h1 className="text-2xl font-bold text-hbl-accent mb-1 mt-10">Sugerencias</h1>
      <p className="text-hbl-text-muted text-sm mb-6">
        Tienes una idea para mejorar la app? Cuentanos!
      </p>

      {submitted ? (
        <div className="flex flex-col items-center gap-4 py-12">
          <CheckCircle className="w-12 h-12 text-hbl-accent" />
          <p className="text-lg font-semibold text-hbl-accent">
            Gracias por tu sugerencia!
          </p>
          <p className="text-sm text-hbl-text-muted text-center">
            La revisaremos y si tiene sentido, la incluiremos en una futura
            version.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="mt-4 px-6 py-2 rounded-xl bg-hbl-surface border border-hbl-border text-sm active:scale-95 transition-transform"
          >
            Enviar otra sugerencia
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="suggestion-text" className="text-sm font-medium">
              Tu sugerencia
            </label>
            <textarea
              id="suggestion-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Que te gustaria que anadieramos o mejoraramos?"
              maxLength={500}
              rows={4}
              required
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-hbl-surface border border-hbl-border text-hbl-text placeholder:text-hbl-text-muted/40 focus:outline-none focus:border-hbl-accent resize-none"
            />
            <span className="text-xs text-hbl-text-muted text-right">
              {text.length}/500
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="suggestion-name" className="text-sm font-medium">
              Tu nombre <span className="text-hbl-text-muted font-normal">(opcional)</span>
            </label>
            <input
              id="suggestion-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre o apodo"
              maxLength={30}
              className="w-full px-4 py-3 rounded-xl bg-hbl-surface border border-hbl-border text-hbl-text placeholder:text-hbl-text-muted/40 focus:outline-none focus:border-hbl-accent"
            />
          </div>

          <button
            type="submit"
            disabled={!text.trim() || submitting}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-hbl-accent text-hbl-bg font-bold disabled:opacity-40 active:scale-95 transition-transform"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            {submitting ? 'Enviando...' : 'Enviar sugerencia'}
          </button>
        </form>
      )}
    </div>
  )
}
