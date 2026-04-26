import { useState, type ReactNode } from 'react'

interface TooltipProps {
  content: string
  children: ReactNode
}

export function Tooltip({ content, children }: TooltipProps) {
  const [visible, setVisible] = useState(false)

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onTouchStart={() => setVisible(true)}
      onTouchEnd={() => setTimeout(() => setVisible(false), 1500)}
    >
      {children}
      {visible && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-hbl-surface-light border border-hbl-border text-xs text-hbl-text whitespace-nowrap z-50 shadow-lg">
          {content}
        </span>
      )}
    </span>
  )
}
