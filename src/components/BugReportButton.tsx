import { useState, useRef } from 'react'
import { Bug, Send, X, Loader2, CheckCircle, Camera, Trash2 } from 'lucide-react'
import { submitBugReport } from '../lib/bug-reports'

export function BugReportButton() {
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setScreenshot(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  function removeScreenshot() {
    setScreenshot(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) return
    setSubmitting(true)
    try {
      await submitBugReport(description.trim(), screenshot)
      setSubmitted(true)
      setDescription('')
      removeScreenshot()
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    setOpen(false)
    setSubmitted(false)
    setDescription('')
    removeScreenshot()
  }

  return (
    <>
      {/* Floating bug button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Reportar bug"
        className="fixed bottom-20 right-4 z-50 w-12 h-12 rounded-full bg-hbl-surface border border-hbl-border shadow-lg flex items-center justify-center active:scale-90 transition-transform"
      >
        <Bug className="w-5 h-5 text-hbl-text-muted" />
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-hbl-bg border border-hbl-border p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-hbl-accent">Reportar Bug</h2>
              <button
                onClick={handleClose}
                aria-label="Cerrar"
                className="p-1 rounded-lg active:scale-90 transition-transform"
              >
                <X className="w-5 h-5 text-hbl-text-muted" />
              </button>
            </div>

            {submitted ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <CheckCircle className="w-10 h-10 text-hbl-accent" />
                <p className="text-sm font-semibold text-hbl-accent">
                  Bug reportado — gracias!
                </p>
                <button
                  onClick={handleClose}
                  className="mt-2 px-4 py-2 rounded-xl bg-hbl-surface border border-hbl-border text-sm active:scale-95 transition-transform"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe el problema..."
                  maxLength={1000}
                  rows={3}
                  required
                  autoFocus
                  className="w-full px-3 py-2 rounded-xl bg-hbl-surface border border-hbl-border text-hbl-text placeholder:text-hbl-text-muted/40 focus:outline-none focus:border-hbl-accent resize-none text-sm"
                />

                {/* Screenshot section */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  data-testid="screenshot-input"
                />

                {previewUrl ? (
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Vista previa"
                      className="w-full max-h-40 object-contain rounded-xl border border-hbl-border"
                    />
                    <button
                      type="button"
                      onClick={removeScreenshot}
                      aria-label="Quitar captura"
                      className="absolute top-1 right-1 p-1.5 rounded-full bg-hbl-bg/80 border border-hbl-border active:scale-90 transition-transform"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-hbl-surface border border-hbl-border text-sm text-hbl-text-muted active:scale-95 transition-transform"
                  >
                    <Camera className="w-4 h-4" />
                    Adjuntar captura
                  </button>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-hbl-text-muted">
                    {description.length}/1000
                  </span>
                  <button
                    type="submit"
                    disabled={!description.trim() || submitting}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-hbl-accent text-hbl-bg font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {submitting ? 'Enviando...' : 'Enviar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
