import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMatchStore, FOUL_BONUS_THRESHOLD } from '../stores/useMatchStore'
import { flushPendingEvents } from '../lib/offlineSync'

function formatTime(seconds: number): string {
  const s = Math.max(0, seconds)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function TeamColumn({
  name,
  score,
  fouls,
  timeouts,
  onGoal,
  onFoul,
  onTimeout,
}: {
  name: string
  score: number
  fouls: number
  timeouts: number
  onGoal: (points: 1 | 2 | 3) => void
  onFoul: () => void
  onTimeout: () => void
}) {
  const isBonus = fouls >= FOUL_BONUS_THRESHOLD

  return (
    <div className="flex flex-col items-center gap-3 flex-1 px-2">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider truncate max-w-full">
        {name}
      </h2>

      {/* Score */}
      <div className="text-5xl font-bold tabular-nums">{score}</div>

      {/* Goal buttons */}
      <div className="flex flex-col gap-2 w-full">
        <button
          onClick={() => onGoal(2)}
          className="min-h-14 rounded-xl bg-orange-500 hover:bg-orange-400 active:bg-orange-600 font-bold text-lg w-full transition-colors"
        >
          +2
        </button>
        <button
          onClick={() => onGoal(3)}
          className="min-h-14 rounded-xl bg-orange-500 hover:bg-orange-400 active:bg-orange-600 font-bold text-lg w-full transition-colors"
        >
          +3
        </button>
        <button
          onClick={() => onGoal(1)}
          className="min-h-14 rounded-xl bg-orange-400 hover:bg-orange-300 active:bg-orange-500 font-bold text-lg w-full transition-colors"
        >
          +1 FT
        </button>
      </div>

      {/* Foul counter */}
      <div className="flex flex-col items-center gap-1 w-full">
        <button
          onClick={onFoul}
          className="min-h-12 rounded-xl bg-red-700 hover:bg-red-600 active:bg-red-800 font-semibold text-sm w-full transition-colors"
        >
          Foul
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300">
            Fouls: <span className="font-bold text-white">{fouls}</span>
          </span>
          {isBonus && (
            <span className="text-xs font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full">
              BONUS
            </span>
          )}
        </div>
      </div>

      {/* Timeouts */}
      <div className="flex flex-col items-center gap-1 w-full">
        <div className="flex gap-1 justify-center">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 ${
                i < timeouts ? 'bg-orange-500 border-orange-500' : 'border-gray-600 bg-transparent'
              }`}
            />
          ))}
        </div>
        <button
          onClick={onTimeout}
          disabled={timeouts <= 0}
          className="min-h-10 rounded-xl bg-gray-700 hover:bg-gray-600 active:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold w-full transition-colors"
        >
          Timeout ({timeouts})
        </button>
      </div>
    </div>
  )
}

function QuarterBreakOverlay({
  quarter,
  onStartNext,
}: {
  quarter: number
  onStartNext: () => void
}) {
  const prevQuarter = quarter - 1
  const isHalftime = prevQuarter === 2
  const breakLabel = isHalftime ? 'Halftime — 10 min' : `Q${prevQuarter} Break — 2 min`

  return (
    <div className="fixed inset-0 bg-gray-950/95 flex flex-col items-center justify-center gap-6 z-50">
      <div className="text-3xl font-bold text-white">{breakLabel}</div>
      <div className="text-gray-400 text-lg">Get ready for Q{quarter}</div>
      <button
        onClick={onStartNext}
        className="min-h-14 px-8 rounded-xl bg-orange-500 hover:bg-orange-400 active:bg-orange-600 font-bold text-xl transition-colors"
      >
        Start Q{quarter}
      </button>
    </div>
  )
}

export default function ScorekeeperPage() {
  const { id: matchId } = useParams<{ id: string }>()
  const {
    match,
    events,
    claimed,
    clockRunning,
    timeRemaining,
    homeFouls,
    awayFouls,
    homeTimeouts,
    awayTimeouts,
    loadMatch,
    claimScorekeeper,
    scoreGoal,
    recordFoul,
    undoLastEvent,
    startClock,
    pauseClock,
    useTimeout,
    endQuarter,
    finishMatch,
  } = useMatchStore()

  const [homeName, setHomeName] = useState('Home')
  const [awayName, setAwayName] = useState('Away')
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    if (matchId) loadMatch(matchId)
  }, [matchId, loadMatch])

  // Connectivity indicator — sync on reconnect
  useEffect(() => {
    function handleOnline() {
      setIsOffline(false)
      flushPendingEvents().catch(console.warn)
    }
    function handleOffline() {
      setIsOffline(true)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Load team names from Supabase teams table if match is loaded
  useEffect(() => {
    if (!match) return
    import('../lib/supabase').then(({ supabase }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(supabase.from('teams') as any)
        .select('id, name')
        .in('id', [match.home_team_id, match.away_team_id])
        .then(({ data }: { data: Array<{ id: string; name: string }> | null }) => {
          if (!data) return
          const home = data.find((t) => t.id === match.home_team_id)
          const away = data.find((t) => t.id === match.away_team_id)
          if (home) setHomeName(home.name)
          if (away) setAwayName(away.name)
        })
    })
  }, [match])

  if (!matchId) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">No match ID provided.</p>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">Loading match…</p>
      </div>
    )
  }

  // Quarter break overlay
  if (match.status === 'quarter_break') {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <QuarterBreakOverlay
          quarter={match.quarter}
          onStartNext={() => {
            startClock()
          }}
        />
      </div>
    )
  }

  // Finished overlay
  if (match.status === 'finished') {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4">
        <div className="text-2xl font-bold">Match Finished</div>
        <div className="text-4xl font-bold tabular-nums">
          {match.home_score} – {match.away_score}
        </div>
        <div className="text-gray-400">
          {homeName} vs {awayName}
        </div>
      </div>
    )
  }

  // Claim screen
  if (!claimed) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6 px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">
            {homeName} vs {awayName}
          </h1>
          <p className="text-gray-400 text-sm">Q{match.quarter} · {match.status}</p>
        </div>

        {match.scorekeeper_claimed_by ? (
          <div className="text-center">
            <p className="text-red-400 font-semibold">Scorekeeper already claimed</p>
            <p className="text-gray-500 text-sm mt-1">Another device is controlling this match.</p>
          </div>
        ) : (
          <button
            onClick={() => claimScorekeeper(match.id)}
            className="min-h-14 px-10 rounded-xl bg-orange-500 hover:bg-orange-400 active:bg-orange-600 font-bold text-xl transition-colors"
          >
            Claim scorekeeper
          </button>
        )}
      </div>
    )
  }

  // Can undo if there are events in current quarter
  const currentQuarterEvents = events.filter((e) => e.quarter === match.quarter)
  const canUndo = currentQuarterEvents.length > 0

  const quarterLabel = match.quarter <= 4 ? `Q${match.quarter}` : `OT${match.quarter - 4}`

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Offline banner */}
      {isOffline && (
        <div className="bg-amber-600 text-white text-sm font-semibold text-center px-4 py-2">
          ⚠️ Sin conexión — los puntos se guardarán al reconectar
        </div>
      )}

      {/* Clock bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div className="text-sm font-semibold text-gray-400">{quarterLabel}</div>
        <div className="text-3xl font-bold tabular-nums tracking-tight">
          {formatTime(timeRemaining)}
        </div>
        <button
          onClick={clockRunning ? pauseClock : startClock}
          className={`min-h-10 px-5 rounded-xl font-bold text-sm transition-colors ${
            clockRunning
              ? 'bg-gray-600 hover:bg-gray-500 active:bg-gray-700'
              : 'bg-orange-500 hover:bg-orange-400 active:bg-orange-600'
          }`}
        >
          {clockRunning ? 'Pause' : 'Start'}
        </button>
      </div>

      {/* Score progress bar */}
      <div className="flex items-center justify-center gap-6 px-4 py-2 bg-gray-900 border-b border-gray-800">
        <span className="text-4xl font-bold tabular-nums">{match.home_score}</span>
        <span className="text-gray-500 text-lg">–</span>
        <span className="text-4xl font-bold tabular-nums">{match.away_score}</span>
      </div>

      {/* Teams */}
      <div className="flex flex-1 gap-2 px-3 py-4">
        <TeamColumn
          name={homeName}
          score={match.home_score}
          fouls={homeFouls}
          timeouts={homeTimeouts}
          onGoal={(pts) => scoreGoal('home', pts)}
          onFoul={() => recordFoul('home')}
          onTimeout={() => useTimeout('home')}
        />

        {/* Divider */}
        <div className="w-px bg-gray-800 self-stretch" />

        <TeamColumn
          name={awayName}
          score={match.away_score}
          fouls={awayFouls}
          timeouts={awayTimeouts}
          onGoal={(pts) => scoreGoal('away', pts)}
          onFoul={() => recordFoul('away')}
          onTimeout={() => useTimeout('away')}
        />
      </div>

      {/* Bottom bar */}
      <div className="flex gap-2 px-3 pb-6 pt-2 border-t border-gray-800 bg-gray-900">
        <button
          onClick={undoLastEvent}
          disabled={!canUndo}
          className="flex-1 min-h-12 rounded-xl bg-gray-700 hover:bg-gray-600 active:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm transition-colors"
        >
          Undo
        </button>
        <button
          onClick={endQuarter}
          className="flex-1 min-h-12 rounded-xl bg-gray-600 hover:bg-gray-500 active:bg-gray-700 font-semibold text-sm transition-colors"
        >
          End Q{match.quarter}
        </button>
        <button
          onClick={finishMatch}
          className="flex-1 min-h-12 rounded-xl bg-red-800 hover:bg-red-700 active:bg-red-900 font-semibold text-sm transition-colors"
        >
          Finish
        </button>
      </div>
    </div>
  )
}
