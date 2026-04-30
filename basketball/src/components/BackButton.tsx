import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

interface BackButtonProps {
  /** Fixed destination. If omitted the button calls navigate(-1). */
  to?: string
  /** Optional short label rendered after the icon. */
  label?: string
}

export function BackButton({ to, label }: BackButtonProps) {
  const navigate = useNavigate()

  const className =
    'absolute top-4 left-4 z-10 flex items-center gap-1.5 text-bbl-text-muted hover:text-bbl-text transition-colors'
  const content = (
    <>
      <ArrowLeft className="w-5 h-5" />
      {label && <span className="text-xs">{label}</span>}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={className} aria-label={label ?? 'Volver'}>
        {content}
      </Link>
    )
  }

  return (
    <button onClick={() => navigate(-1)} className={className} aria-label={label ?? 'Volver'}>
      {content}
    </button>
  )
}
