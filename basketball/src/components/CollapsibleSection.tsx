import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface CollapsibleSectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
  titleClassName?: string
}

export function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
  titleClassName = 'text-lg font-bold text-bbl-accent uppercase tracking-widest',
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full min-h-11 text-left"
        aria-expanded={open}
      >
        <h2 className={titleClassName}>{title}</h2>
        <ChevronDown
          className={`w-5 h-5 text-bbl-text-muted shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && children}
    </section>
  )
}
