import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import type { ConnectionState } from '../../hooks/useConnectionStatus'

interface ConnectionStatusProps {
  state: ConnectionState
  pendingCount: number
}

const config: Record<ConnectionState, { icon: typeof Wifi; label: string; className: string }> = {
  online: {
    icon: Wifi,
    label: 'En línea',
    className: 'text-hbl-accent',
  },
  offline: {
    icon: WifiOff,
    label: 'Sin conexión',
    className: 'text-hbl-clock',
  },
  syncing: {
    icon: RefreshCw,
    label: 'Sincronizando',
    className: 'text-hbl-team-away',
  },
}

export function ConnectionStatus({ state, pendingCount }: ConnectionStatusProps) {
  const { icon: Icon, label, className } = config[state]

  return (
    <div className={`flex items-center gap-1.5 text-xs ${className}`}>
      <Icon className={`w-3.5 h-3.5 ${state === 'syncing' ? 'animate-spin' : ''}`} />
      <span>{label}</span>
      {state === 'offline' && pendingCount > 0 && (
        <span className="px-1.5 py-0.5 rounded-full bg-hbl-clock/20 text-hbl-clock text-[10px] font-medium">
          {pendingCount} pendientes
        </span>
      )}
    </div>
  )
}
