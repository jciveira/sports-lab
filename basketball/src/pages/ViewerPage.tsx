import { useParams } from 'react-router-dom'
import { useRealtimeMatch } from '../hooks/useRealtimeMatch'

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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading match…</p>
        </div>
      </div>
    )
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-red-400 text-lg">{error ?? 'Match not found.'}</p>
      </div>
    )
  }

  if (match.status === 'scheduled') {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-gray-300 text-2xl font-semibold text-center">Match not started yet</p>
        {homeTeam && awayTeam && (
          <p className="text-gray-500 text-base text-center">
            {homeTeam.name} vs {awayTeam.name}
          </p>
        )}
      </div>
    )
  }

  const isFinished = match.status === 'finished'
  const homeName = homeTeam?.name ?? 'Home'
  const awayName = awayTeam?.name ?? 'Away'
  const clockSeconds = match.time_remaining_seconds ?? 0

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Reconnecting banner */}
      {isReconnecting && (
        <div className="bg-yellow-900/80 text-yellow-300 text-xs text-center py-1 px-4">
          Reconnecting to live updates…
        </div>
      )}

      {/* Finished banner */}
      {isFinished && (
        <div className="bg-orange-500/20 border-b border-orange-500/40 text-orange-300 text-center py-3 px-4 text-lg font-semibold tracking-wide">
          Match finished
        </div>
      )}

      {/* Main scoreboard */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-8">
        {/* Quarter & Clock */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-orange-400 font-bold text-2xl tracking-widest uppercase">
            {quarterLabel(match.quarter)}
          </span>
          <span className="text-gray-200 text-4xl font-mono font-semibold tabular-nums">
            {formatClock(clockSeconds)}
          </span>
        </div>

        {/* Score row */}
        <div className="w-full max-w-sm grid grid-cols-3 items-center gap-2">
          {/* Home team */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-gray-100 text-2xl font-bold text-center leading-tight">
              {homeName}
            </span>
            <span className="text-white text-7xl font-extrabold tabular-nums leading-none">
              {match.home_score}
            </span>
          </div>

          {/* Separator */}
          <div className="flex justify-center">
            <span className="text-gray-600 text-5xl font-light">–</span>
          </div>

          {/* Away team */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-gray-100 text-2xl font-bold text-center leading-tight">
              {awayName}
            </span>
            <span className="text-white text-7xl font-extrabold tabular-nums leading-none">
              {match.away_score}
            </span>
          </div>
        </div>

        {/* Team fouls */}
        <div className="w-full max-w-sm grid grid-cols-2 gap-4 mt-2">
          <div className="flex flex-col items-center bg-gray-900 rounded-xl py-3 px-4">
            <span className="text-gray-400 text-xs uppercase tracking-widest mb-1">Team Fouls</span>
            <span className="text-gray-100 text-3xl font-bold tabular-nums">{homeFouls}</span>
            <span className="text-gray-500 text-xs mt-1 truncate max-w-full">{homeName}</span>
          </div>
          <div className="flex flex-col items-center bg-gray-900 rounded-xl py-3 px-4">
            <span className="text-gray-400 text-xs uppercase tracking-widest mb-1">Team Fouls</span>
            <span className="text-gray-100 text-3xl font-bold tabular-nums">{awayFouls}</span>
            <span className="text-gray-500 text-xs mt-1 truncate max-w-full">{awayName}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
