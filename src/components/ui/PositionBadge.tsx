import type { PlayerRole } from '../../types'
import { getPositionLabel } from '../../lib/rules'
import { detectLang } from '../../lib/i18n'
import { Tooltip } from './Tooltip'

interface PositionBadgeProps {
  role: PlayerRole
  lang?: 'en' | 'es'
}

export function PositionBadge({ role, lang }: PositionBadgeProps) {
  const resolvedLang = lang ?? detectLang()
  const fullName = getPositionLabel(role, resolvedLang)

  return (
    <Tooltip content={fullName}>
      <span className="inline-flex items-center px-2 py-0.5 rounded bg-hbl-surface-light border border-hbl-border text-xs font-medium text-hbl-accent cursor-help">
        {role}
      </span>
    </Tooltip>
  )
}
