import { useParams } from 'react-router-dom'
import { Wifi, WifiOff } from 'lucide-react'
import { useRealtimeMatch } from '../hooks/useRealtimeMatch'
import { BackButton } from '../components/BackButton'

function quarterLabel(quarter: number): string {
  if (quarter <= 4) return `Q${quarter}`
  return 'OT'
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function ViewerPage() {
  const { id } = useParams<{ id: string }>()
  const { match, homeTeam, awayTeam, homeFouls, awayFouls, loading, error, isReconnecting } =
    useRealtimeMatch(id)

  if (loading) {
    return (
      <div className="relative min-h-screen bg-bbl-bg flex items-center justify-center">
        <BackButton to="/partidos" />
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-bbl-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-bbl-text-muted text-sm">Cargando partido…</p>
        </div>
      </div>
    )
  }

  if (error || !match) {
    return (
      <div className="relative min-h-screen bg-bbl-bg flex items-center justify-center">
        <BackButton to="/partidos" />
        <p className="text-bbl-clock text-lg">{error ?? 'Partido no encontrado.'}</p>
      </div>
    )
  }

  if (match.status === 'scheduled') {
    return (
      <div className="relative min-h-screen bg-bbl-bg flex flex-col items-center justify-center gap-4 px-4">
        <BackButton to="/partidos" />
        <p className="text-bbl-text text-2xl font-semibold text-center">Partido no iniciado</p>
        {homeTeam && awayTeam && (
          <p className="text-bbl-text-muted text-base text-center">
            {homeTeam.name} vs {awayTeam.name}
          </p>
        )}
      </div>
    )
  }

  const isFinished = match.status === 'finished'
  const homeName = homeTeam?.name ?? 'Local'
  const awayName = awayTeam?.name ?? 'Visitante'
  const clockSeconds = match.time_remaining_seconds ?? 0
  const hasScorekeeper = !!match.scorekeeper_claimed_by

  return (
    <div className="relative min-h-screen bg-bbl-bg flex flex-col">
      <div
        className="pointer-events-none absolute inset-0 bg-center bg-no-repeat bg-contain opacity-[0.07]"
        style={{ backgroundImage: 'url(/icons/team-badge.png)' }}
        aria-hidden="true"
      />

      {/* Connection status bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-bbl-border">
        {isReconnecting ? (
          <span className="flex items-center gap-1.5 text-xs text-bbl-warning">
            <WifiOff className="w-3.5 h-3.5" />
            Reconectando…
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-bbl-accent">
            <Wifi className="w-3.5 h-3.5" />
            En línea
          </span>
        )}
        {!hasScorekeeper && !isFinished && (
          <span className="text-[10px] text-bbl-text-muted">Sin marcador activo</span>
        )}
      </div>

      {isFinished && (
        <div className="bg-bbl-accent/20 border-b border-bbl-accent/40 text-bbl-accent text-center py-3 px-4 text-lg font-semibold tracking-wide">
          Partido finalizado
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-8">
        <div className="flex flex-col items-center gap-1">
          <span className="text-bbl-accent font-bold text-2xl tracking-widest uppercase">
            {quarterLabel(match.quarter)}
          </span>
          <span className="text-bbl-text text-4xl font-mono font-semibold tabular-nums">
            {formatClock(clockSeconds)}
          </span>
        </div>

        <div className="w-full max-w-sm grid grid-cols-3 items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            {homeTeam?.badge_url && (
              <img src={homeTeam.badge_url} alt="" className="w-10 h-10 object-contain rounded-md" />
            )}
            <span className="text-bbl-text text-2xl font-bold text-center leading-tight">
              {homeName}
            </span>
            <span className="text-bbl-text text-7xl font-extrabold tabular-nums leading-none">
              {match.home_score}
            </span>
          </div>

          <div className="flex justify-center">
            <span className="text-bbl-border text-5xl font-light">–</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            {awayTeam?.badge_url && (
              <img src={awayTeam.badge_url} alt="" className="w-10 h-10 object-contain rounded-md" />
            )}
            <span className="text-bbl-text text-2xl font-bold text-center leading-tight">
              {awayName}
            </span>
            <span className="text-bbl-text text-7xl font-extrabold tabular-nums leading-none">
              {match.away_score}
            </span>
          </div>
        </div>

        <div className="w-full max-w-sm grid grid-cols-2 gap-4 mt-2">
          <div className="flex flex-col items-center bg-bbl-surface rounded-xl py-3 px-4">
            <span className="text-bbl-text-muted text-xs uppercase tracking-widest mb-1">Faltas</span>
            <span className="text-bbl-text text-3xl font-bold tabular-nums">{homeFouls}</span>
            <span className="text-bbl-text-muted text-xs mt-1 truncate max-w-full">{homeName}</span>
          </div>
          <div className="flex flex-col items-center bg-bbl-surface rounded-xl py-3 px-4">
            <span className="text-bbl-text-muted text-xs uppercase tracking-widest mb-1">Faltas</span>
            <span className="text-bbl-text text-3xl font-bold tabular-nums">{awayFouls}</span>
            <span className="text-bbl-text-muted text-xs mt-1 truncate max-w-full">{awayName}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
