import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface CodeRowProps {
  label: string
  code: string
  hint?: string
}

export function CodeRow({ label, code, hint }: CodeRowProps) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-1 bg-hbl-surface rounded-xl border border-hbl-border p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-hbl-text-muted">{label}</span>
        {hint && <span className="text-xs text-hbl-text-muted/60">{hint}</span>}
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-2xl font-mono tracking-[0.3em] text-hbl-text">{code}</span>
        <button
          onClick={copy}
          className="p-2 rounded-lg hover:bg-hbl-surface-light transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-hbl-accent" /> : <Copy className="w-4 h-4 text-hbl-text-muted" />}
        </button>
      </div>
    </div>
  )
}

interface LinkRowProps {
  label: string
  url: string
  hint?: string
}

export function LinkRow({ label, url, hint }: LinkRowProps) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-1 bg-hbl-surface rounded-xl border border-hbl-border p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-hbl-text-muted">{label}</span>
        {hint && <span className="text-xs text-hbl-text-muted/60">{hint}</span>}
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-sm text-hbl-text truncate mr-2">{url}</span>
        <button
          onClick={copy}
          className="p-2 rounded-lg hover:bg-hbl-surface-light transition-colors shrink-0"
        >
          {copied ? <Check className="w-4 h-4 text-hbl-accent" /> : <Copy className="w-4 h-4 text-hbl-text-muted" />}
        </button>
      </div>
    </div>
  )
}
